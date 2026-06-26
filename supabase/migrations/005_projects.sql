-- ─── Projects ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  project_type text NOT NULL DEFAULT 'custom'
    CHECK (project_type IN ('event','release','health','learning','business','custom')),
  goal text,
  target_date date,
  status text NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning','active','completed','paused','archived')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  success_metric text,
  budget integer,
  revenue_goal integer,
  current_state text,
  missing_info text,
  priority_focus text,
  ai_generated boolean DEFAULT false,
  ai_generation_model text,
  prompt_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='projects' AND policyname='projects_owner'
  ) THEN
    CREATE POLICY "projects_owner" ON projects FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- ─── Project Tasks ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  role_id uuid REFERENCES roles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  due_date date,
  start_time timestamptz,
  end_time timestamptz,
  estimated_minutes integer,
  importance text CHECK (importance IN ('low','medium','high')),
  urgency text CHECK (urgency IN ('low','medium','high')),
  quadrant integer CHECK (quadrant BETWEEN 1 AND 4),
  status text NOT NULL DEFAULT 'todo'
    CHECK (status IN ('todo','doing','done','skipped')),
  dependency_task_id uuid REFERENCES project_tasks(id) ON DELETE SET NULL,
  ai_reason text,
  created_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  created_schedule_id uuid REFERENCES schedules(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='project_tasks' AND policyname='project_tasks_owner'
  ) THEN
    CREATE POLICY "project_tasks_owner" ON project_tasks FOR ALL USING (user_id = auth.uid());
  END IF;
END $$;

-- ─── Extend existing tables ───────────────────────────────────────────────────
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_task_id uuid REFERENCES project_tasks(id) ON DELETE SET NULL;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS project_task_id uuid REFERENCES project_tasks(id) ON DELETE SET NULL;

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_role_id ON projects(role_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(user_id, status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_user_id ON project_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_due_date ON project_tasks(user_id, due_date);

-- ─── updated_at triggers ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_projects()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_projects();

DROP TRIGGER IF EXISTS project_tasks_updated_at ON project_tasks;
CREATE TRIGGER project_tasks_updated_at
  BEFORE UPDATE ON project_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_projects();
