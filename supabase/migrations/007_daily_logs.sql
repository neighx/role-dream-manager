-- 007_daily_logs.sql
-- Daily Log / まめ日記 機能

CREATE TABLE IF NOT EXISTS daily_logs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  -- 気分・日記
  mood_after          TEXT CHECK (mood_after IN ('great', 'good', 'okay', 'tired', 'rough')),
  one_line_diary      TEXT,
  roles_grown         TEXT[],                     -- role ID の配列
  -- 活動時間（分）
  exercise_minutes    INTEGER NOT NULL DEFAULT 0,
  english_minutes     INTEGER NOT NULL DEFAULT 0,
  creator_minutes     INTEGER NOT NULL DEFAULT 0,
  work_minutes        INTEGER NOT NULL DEFAULT 0,
  study_minutes       INTEGER NOT NULL DEFAULT 0,
  -- 睡眠
  sleep_hours         NUMERIC(3,1),
  -- 天気
  weather             TEXT,
  temperature         INTEGER,
  location            TEXT,
  weather_provider    TEXT,
  weather_fetched_at  TIMESTAMPTZ,
  -- 写真・メモ
  photo_url           TEXT,
  tomorrow_note       TEXT,
  -- metadata
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'users can manage own daily_logs'
      AND tablename = 'daily_logs'
  ) THEN
    CREATE POLICY "users can manage own daily_logs" ON daily_logs
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS daily_logs_user_date ON daily_logs(user_id, date DESC);
