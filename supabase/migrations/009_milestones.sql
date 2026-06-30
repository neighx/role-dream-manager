-- 009_milestones.sql
-- マイルストーン（達成記録）機能

CREATE TABLE IF NOT EXISTS milestones (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id         UUID REFERENCES roles(id) ON DELETE SET NULL,
  category        TEXT NOT NULL CHECK (category IN ('creator', 'health', 'work', 'relationship', 'learning', 'selfcare')),
  title           TEXT NOT NULL,
  description     TEXT,
  achieved_date   DATE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'users can manage own milestones'
      AND tablename = 'milestones'
  ) THEN
    CREATE POLICY "users can manage own milestones" ON milestones
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS milestones_user_date ON milestones(user_id, achieved_date DESC);
