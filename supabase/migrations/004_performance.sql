-- ════════════════════════════════════════════════════════════
-- 004_performance.sql  スケーリング対応・パフォーマンス最適化
-- 100〜10,000ユーザーに対応するインデックス・テーブル設計
-- ════════════════════════════════════════════════════════════

-- ─── Supabase Storage バケット ─────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vision-photos',
  'vision-photos',
  true,
  5242880,  -- 5MB上限（最適化済み画像なら十分）
  ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS（オーナーのみ書き込み、公開読み取り）
CREATE POLICY "vision-photos public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'vision-photos');

CREATE POLICY "vision-photos owner write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'vision-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "vision-photos owner update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'vision-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "vision-photos owner delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'vision-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── Storage Metadata（URLとメタ情報のみDB保存） ─────────────
CREATE TABLE IF NOT EXISTS storage_files (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path     text NOT NULL,
  public_url       text NOT NULL,
  thumbnail_url    text,                        -- サムネイル（400px）URL
  mime_type        text,
  file_size_bytes  bigint,
  width            integer,
  height           integer,
  entity_type      text NOT NULL,              -- 'role_vision' | 'attachment'
  entity_id        uuid,                       -- 紐づくロールID等
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)              -- 1エンティティ = 1画像（upsert用）
);

CREATE INDEX IF NOT EXISTS idx_storage_files_user_id ON storage_files(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_files_entity  ON storage_files(entity_type, entity_id);

ALTER TABLE storage_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "storage_files: own rows" ON storage_files
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── AI Logs（軽量版：PII全文ログなし） ─────────────────────
CREATE TABLE IF NOT EXISTS ai_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature         text NOT NULL,   -- 'today_plan'|'quick_capture'|'roadmap'|'weekly_review'
  model           text,
  prompt_version  text,
  result_summary  text,            -- 生成結果の要約（最大500文字、PII除去）
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- user_id + created_at の複合インデックス（ユーザー別ログ取得 + 古いログ削除）
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_created ON ai_logs(user_id, created_at DESC);

ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_logs: own rows" ON ai_logs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 90日以上のAIログを自動削除する関数
CREATE OR REPLACE FUNCTION cleanup_old_ai_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM ai_logs WHERE created_at < now() - interval '90 days';
END;
$$;

-- ─── Weekly Summaries（週次集計キャッシュ） ──────────────────
-- 毎回全件計算せず、集計結果を保存して高速ロード
CREATE TABLE IF NOT EXISTS weekly_summaries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start       date NOT NULL,
  week_end         date NOT NULL,
  tasks_done       integer NOT NULL DEFAULT 0,
  tasks_total      integer NOT NULL DEFAULT 0,
  checkin_count    integer NOT NULL DEFAULT 0,
  avg_energy       numeric(5,2),
  role_activity    jsonb NOT NULL DEFAULT '{}', -- {role_id: {total, done}}
  ai_review        jsonb,                       -- AIレビュー全文キャッシュ
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_summaries_user_week ON weekly_summaries(user_id, week_start DESC);

ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weekly_summaries: own rows" ON weekly_summaries
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER weekly_summaries_updated_at
  BEFORE UPDATE ON weekly_summaries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Database Indexes ─────────────────────────────────────────
-- ユーザー別クエリが多いテーブルは user_id に必ずインデックス

-- roles
CREATE INDEX IF NOT EXISTS idx_roles_user_id       ON roles(user_id);
CREATE INDEX IF NOT EXISTS idx_roles_user_order    ON roles(user_id, display_order);

-- tasks（複合インデックスで主要クエリをカバー）
CREATE INDEX IF NOT EXISTS idx_tasks_user_id       ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_role_id       ON tasks(role_id) WHERE role_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date      ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_status        ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_status   ON tasks(user_id, status);       -- ホーム画面クエリ用
CREATE INDEX IF NOT EXISTS idx_tasks_user_quadrant ON tasks(user_id, quadrant);     -- Today Plan用
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_at  ON tasks(user_id, scheduled_at) WHERE scheduled_at IS NOT NULL;

-- daily_checkins
CREATE INDEX IF NOT EXISTS idx_checkins_user_id    ON daily_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date       ON daily_checkins(date);
CREATE INDEX IF NOT EXISTS idx_checkins_user_date  ON daily_checkins(user_id, date DESC);

-- schedules（start_timeが最も使われる）
CREATE INDEX IF NOT EXISTS idx_schedules_user_id    ON schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_role_id    ON schedules(role_id) WHERE role_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_schedules_start_time ON schedules(start_time);
CREATE INDEX IF NOT EXISTS idx_schedules_user_start ON schedules(user_id, start_time); -- カレンダークエリ用

-- quick_captures
CREATE INDEX IF NOT EXISTS idx_quick_captures_user_id      ON quick_captures(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_captures_user_created ON quick_captures(user_id, created_at DESC);

-- inbox_items
CREATE INDEX IF NOT EXISTS idx_inbox_items_user_id     ON inbox_items(user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_items_user_status ON inbox_items(user_id, status); -- 未処理フィルタ用

-- shared_members
CREATE INDEX IF NOT EXISTS idx_shared_members_role_id         ON shared_members(role_id);
CREATE INDEX IF NOT EXISTS idx_shared_members_invited_user_id ON shared_members(invited_user_id)
  WHERE invited_user_id IS NOT NULL;

-- daily_plans（テーブルが存在する場合のみ）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_plans' AND table_schema = 'public') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_daily_plans_user_id   ON daily_plans(user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_daily_plans_date      ON daily_plans(date)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date ON daily_plans(user_id, date DESC)';
  END IF;
END;
$$;
