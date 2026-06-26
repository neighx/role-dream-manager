-- ════════════════════════════════════════════════════════════
-- 002_ai_features.sql
-- Today's Role Plan AI強化のためのDB追加
-- ════════════════════════════════════════════════════════════

-- tasks テーブル: AI生成フィールド追加
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS related_dream              text,
  ADD COLUMN IF NOT EXISTS related_long_term_goal     text,
  ADD COLUMN IF NOT EXISTS related_monthly_goal       text,
  ADD COLUMN IF NOT EXISTS current_reality_reference  text,
  ADD COLUMN IF NOT EXISTS gap_target                 text,
  ADD COLUMN IF NOT EXISTS next_focus_reference       text,
  ADD COLUMN IF NOT EXISTS today_reason               text,
  ADD COLUMN IF NOT EXISTS emotional_adjustment_reason text,
  ADD COLUMN IF NOT EXISTS action_size                text CHECK (action_size IN ('attack', 'normal', 'small', 'minimum')),
  ADD COLUMN IF NOT EXISTS ai_generated               boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_generation_model        text,
  ADD COLUMN IF NOT EXISTS ai_generation_prompt_version text,
  ADD COLUMN IF NOT EXISTS regenerated_from_task_id   uuid REFERENCES tasks(id) ON DELETE SET NULL;

-- daily_plans テーブル
CREATE TABLE IF NOT EXISTS daily_plans (
  id                       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                     date NOT NULL,
  checkin_id               uuid REFERENCES daily_checkins(id) ON DELETE SET NULL,
  selected_role_ids        uuid[] DEFAULT '{}',
  overall_message          text,
  pet_message              text,
  emotional_summary        text,
  available_time_strategy  text,
  reflection_question      text,
  not_today_json           jsonb DEFAULT '[]',
  ai_generated             boolean DEFAULT false,
  ai_generation_model      text,
  prompt_version           text,
  raw_ai_response          text,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- daily_plan_tasks テーブル
CREATE TABLE IF NOT EXISTS daily_plan_tasks (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  daily_plan_id   uuid NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  task_id         uuid REFERENCES tasks(id) ON DELETE SET NULL,
  role_id         uuid REFERENCES roles(id) ON DELETE SET NULL,
  order_index     int DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "daily_plans_own"
  ON daily_plans FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE daily_plan_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "daily_plan_tasks_own"
  ON daily_plan_tasks FOR ALL
  USING (
    daily_plan_id IN (
      SELECT id FROM daily_plans WHERE user_id = auth.uid()
    )
  );

-- updated_at trigger for daily_plans
CREATE TRIGGER daily_plans_updated_at
  BEFORE UPDATE ON daily_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
