-- ════════════════════════════════════════════════════════════
-- 003_quick_capture.sql  Quick Capture / Voice TODO機能
-- ════════════════════════════════════════════════════════════

-- tasks: Quick Capture関連カラム追加
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS source                      text DEFAULT 'manual'
    CHECK (source IN ('manual','quick_capture','today_plan','shared')),
  ADD COLUMN IF NOT EXISTS gap_target                  text,
  ADD COLUMN IF NOT EXISTS long_term_connection        text,
  ADD COLUMN IF NOT EXISTS today_reason                text,
  ADD COLUMN IF NOT EXISTS emotional_adjustment_reason text,
  ADD COLUMN IF NOT EXISTS created_from_quick_capture_id uuid;

-- schedules: Quick Capture関連カラム追加
ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS source                      text DEFAULT 'manual'
    CHECK (source IN ('manual','quick_capture','shared')),
  ADD COLUMN IF NOT EXISTS created_from_quick_capture_id uuid,
  ADD COLUMN IF NOT EXISTS gap_target                  text,
  ADD COLUMN IF NOT EXISTS long_term_connection        text;

-- quick_captures テーブル
CREATE TABLE IF NOT EXISTS quick_captures (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_input               text NOT NULL,
  input_type              text NOT NULL DEFAULT 'text' CHECK (input_type IN ('text','voice')),
  transcribed_text        text,
  parsed_type             text CHECK (parsed_type IN ('task','schedule','reminder','idea','inbox')),
  parsed_json             jsonb,
  status                  text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','saved','dismissed')),
  confidence              text CHECK (confidence IN ('low','medium','high')),
  created_task_id         uuid REFERENCES tasks(id) ON DELETE SET NULL,
  created_schedule_id     uuid,
  created_role_id         uuid REFERENCES roles(id) ON DELETE SET NULL,
  created_daily_plan_id   uuid,
  ai_provider             text,
  ai_model                text,
  prompt_version          text,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

-- inbox_items テーブル
CREATE TABLE IF NOT EXISTS inbox_items (
  id                            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_input                     text NOT NULL,
  title                         text NOT NULL,
  description                   text,
  suggested_type                text CHECK (suggested_type IN ('task','schedule','idea')),
  suggested_role_id             uuid REFERENCES roles(id) ON DELETE SET NULL,
  suggested_date                date,
  suggested_quadrant            text,
  suggested_gap_target          text,
  suggested_long_term_connection text,
  status                        text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','converted','archived')),
  created_at                    timestamptz DEFAULT now(),
  updated_at                    timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE quick_captures ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "quick_captures_own"
  ON quick_captures FOR ALL USING (user_id = auth.uid());

ALTER TABLE inbox_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "inbox_items_own"
  ON inbox_items FOR ALL USING (user_id = auth.uid());

-- updated_at triggers
CREATE TRIGGER quick_captures_updated_at
  BEFORE UPDATE ON quick_captures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER inbox_items_updated_at
  BEFORE UPDATE ON inbox_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
