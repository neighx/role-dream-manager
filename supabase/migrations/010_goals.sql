-- 010_goals.sql
-- スマートゴール機能（目標 + 逆算タスク）

CREATE TABLE IF NOT EXISTS goals (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'other',
  event_date   DATE NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'users can manage own goals' AND tablename = 'goals'
  ) THEN
    CREATE POLICY "users can manage own goals" ON goals
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS goals_user_date ON goals(user_id, event_date ASC);

-- ─── ゴールタスク ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS goal_tasks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id      UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  due_date     DATE,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE goal_tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'users can manage own goal_tasks' AND tablename = 'goal_tasks'
  ) THEN
    CREATE POLICY "users can manage own goal_tasks" ON goal_tasks
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS goal_tasks_goal ON goal_tasks(goal_id, sort_order);
CREATE INDEX IF NOT EXISTS goal_tasks_user_date ON goal_tasks(user_id, due_date);
