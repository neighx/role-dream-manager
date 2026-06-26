-- ════════════════════════════════════════════════════════════
-- Role Dream Manager — 001_initial.sql
-- ════════════════════════════════════════════════════════════

-- ─── users_profile ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users_profile (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                  text,
  birthday              date,
  gender                text CHECK (gender IN ('female', 'male', 'other', 'unanswered')),
  life_vision           text,
  selected_pet          text CHECK (selected_pet IN ('cat', 'dog', 'robot')),
  onboarding_completed  boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_profile_owner" ON users_profile
  FOR ALL USING (user_id = auth.uid());

-- ─── roles ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category          text NOT NULL CHECK (category IN ('creator','health','work','relationship','learning','selfcare')),
  title             text NOT NULL,
  subtype           text,
  values            text[] NOT NULL DEFAULT '{}',
  dream             text,
  vision_photo_url  text,
  current_reality   text,
  gap               text,
  next_focus        text,
  three_year_goal   text,
  one_year_goal     text,
  three_month_goal  text,
  monthly_goal      text,
  weekly_goal       text,
  progress          integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  is_private        boolean NOT NULL DEFAULT true,
  display_order     integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_owner" ON roles
  FOR ALL USING (user_id = auth.uid());

-- ─── tasks ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id             uuid REFERENCES roles(id) ON DELETE SET NULL,
  title               text NOT NULL,
  description         text,
  purpose             text,
  due_date            date,
  estimated_minutes   integer,
  difficulty          integer CHECK (difficulty BETWEEN 1 AND 5),
  importance          integer CHECK (importance BETWEEN 1 AND 5),
  urgency             integer CHECK (urgency BETWEEN 1 AND 5),
  quadrant            integer CHECK (quadrant BETWEEN 1 AND 4),
  energy_level        integer CHECK (energy_level IN (10, 40, 70, 100)),
  emotional_mode      text CHECK (emotional_mode IN ('attack','progress','maintain','protect','recover')),
  status              text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done','skipped')),
  completed_at        timestamptz,
  scheduled_at        timestamptz,
  linked_schedule_id  uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_owner" ON tasks
  FOR ALL USING (user_id = auth.uid());

-- ─── schedules ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedules (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id               uuid REFERENCES roles(id) ON DELETE SET NULL,
  title                 text NOT NULL,
  description           text,
  location              text,
  schedule_type         text NOT NULL DEFAULT 'other',
  start_time            timestamptz NOT NULL,
  end_time              timestamptz,
  is_all_day            boolean NOT NULL DEFAULT false,
  color                 text,
  linked_task_id        uuid REFERENCES tasks(id) ON DELETE SET NULL,
  shared_visibility     boolean NOT NULL DEFAULT true,
  external_calendar_id  text,
  external_event_id     text,
  sync_provider         text CHECK (sync_provider IN ('google', 'apple')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- tasks.linked_schedule_id の外部キー（循環依存を避けるため後から追加）
ALTER TABLE tasks ADD CONSTRAINT tasks_linked_schedule_fk
  FOREIGN KEY (linked_schedule_id) REFERENCES schedules(id) ON DELETE SET NULL;

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedules_owner" ON schedules
  FOR ALL USING (user_id = auth.uid());

-- shared_membersで許可されたユーザーが閲覧可能（後のmigrationで追加）

-- ─── daily_checkins ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_checkins (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood              text NOT NULL CHECK (mood IN ('good','normal','anxious','rushed','unmotivated','angry','sad')),
  energy            integer NOT NULL CHECK (energy IN (10, 40, 70, 100)),
  stress_cause      text NOT NULL CHECK (stress_cause IN ('money','time','relationship','perfectionism','body','future_anxiety','decision_fatigue','other')),
  mode              text NOT NULL CHECK (mode IN ('attack','progress','maintain','protect','recover')),
  selected_role_ids uuid[] NOT NULL DEFAULT '{}',
  pet_message       text,
  date              date NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_checkins_owner" ON daily_checkins
  FOR ALL USING (user_id = auth.uid());

-- ─── shared_members ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shared_members (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id           uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  owner_user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email     text NOT NULL,
  invited_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  relationship_type text NOT NULL CHECK (relationship_type IN ('manager','partner','family','friend','team','coach','teacher')),
  permission        text NOT NULL DEFAULT 'view' CHECK (permission IN ('view','comment','edit_tasks','manager')),
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shared_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_members_owner" ON shared_members
  FOR ALL USING (owner_user_id = auth.uid());

CREATE POLICY "shared_members_invitee_view" ON shared_members
  FOR SELECT USING (invited_user_id = auth.uid());

-- 共有されたスケジュールのポリシー追加
CREATE POLICY "schedules_shared_viewer" ON schedules
  FOR SELECT USING (
    shared_visibility = true
    AND role_id IN (
      SELECT role_id FROM shared_members
      WHERE invited_user_id = auth.uid()
        AND status = 'accepted'
    )
  );

-- ─── comments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id     uuid REFERENCES roles(id) ON DELETE CASCADE,
  task_id     uuid REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (role_id IS NOT NULL OR task_id IS NOT NULL)
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_owner" ON comments
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "comments_shared_view" ON comments
  FOR SELECT USING (
    role_id IN (
      SELECT role_id FROM shared_members
      WHERE invited_user_id = auth.uid()
        AND status = 'accepted'
    )
  );

-- ─── pet_messages ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pet_messages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_type          text NOT NULL CHECK (pet_type IN ('cat','dog','robot')),
  message_type      text NOT NULL CHECK (message_type IN ('morning','task_complete','plan_generated','behind_schedule','weekly_review','comment_received')),
  body              text NOT NULL,
  related_task_id   uuid REFERENCES tasks(id) ON DELETE SET NULL,
  related_role_id   uuid REFERENCES roles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pet_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pet_messages_owner" ON pet_messages
  FOR ALL USING (user_id = auth.uid());

-- ─── updated_at 自動更新トリガー ─────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_profile_updated_at BEFORE UPDATE ON users_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER schedules_updated_at BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER shared_members_updated_at BEFORE UPDATE ON shared_members FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── users_profile 自動作成トリガー ──────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users_profile (user_id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
