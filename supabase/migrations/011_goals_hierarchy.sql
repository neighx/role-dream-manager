-- 011_goals_hierarchy.sql
-- ゴールにロール紐付き・階層・時間軸を追加

-- role_id: どのRoleに属するか（null = ロール非紐付き）
ALTER TABLE goals ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

-- parent_goal_id: 大ゴールへの参照（null = トップレベルゴール）
ALTER TABLE goals ADD COLUMN IF NOT EXISTS parent_goal_id UUID REFERENCES goals(id) ON DELETE SET NULL;

-- time_horizon: 時間軸（event=特定日付イベント, monthly=今月, 3month=3ヶ月, 1year=1年, 3year=3年）
ALTER TABLE goals ADD COLUMN IF NOT EXISTS time_horizon TEXT NOT NULL DEFAULT 'event';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'goals_time_horizon_check'
  ) THEN
    ALTER TABLE goals ADD CONSTRAINT goals_time_horizon_check
      CHECK (time_horizon IN ('3year', '1year', '3month', 'monthly', 'event'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS goals_role ON goals(user_id, role_id);
CREATE INDEX IF NOT EXISTS goals_parent ON goals(parent_goal_id);
