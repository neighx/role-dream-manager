-- 006_daily_reflections.sql
-- 今日の1行振り返り機能

CREATE TABLE IF NOT EXISTS daily_reflections (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  log_text    TEXT,
  role_id     UUID REFERENCES roles(id) ON DELETE SET NULL,
  mood        TEXT CHECK (mood IN ('great', 'good', 'okay', 'tired', 'rough')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_reflections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'users can manage own reflections'
      AND tablename = 'daily_reflections'
  ) THEN
    CREATE POLICY "users can manage own reflections" ON daily_reflections
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS daily_reflections_user_date ON daily_reflections(user_id, date DESC);
