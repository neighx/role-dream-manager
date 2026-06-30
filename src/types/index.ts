// ─── Role カテゴリ ───────────────────────────────────────────
export type RoleCategory =
  | "creator"
  | "health"
  | "work"
  | "relationship"
  | "learning"
  | "selfcare";

// ─── ペット ───────────────────────────────────────────────────
export type PetType = "cat" | "dog" | "robot";

// ─── 感情 ─────────────────────────────────────────────────────
export type Mood =
  | "good"
  | "normal"
  | "anxious"
  | "rushed"
  | "unmotivated"
  | "angry"
  | "sad";

export type EnergyLevel = 10 | 40 | 70 | 100;

export type StressCause =
  | "money"
  | "time"
  | "relationship"
  | "perfectionism"
  | "body"
  | "future_anxiety"
  | "decision_fatigue"
  | "other";

export type DayMode =
  | "attack"
  | "progress"
  | "maintain"
  | "protect"
  | "recover";

// ─── ユーザープロフィール ───────────────────────────────────────
export type DisplayMode = "simple" | "detail";

export interface UserProfile {
  id: string;
  user_id: string;
  name: string | null;
  birthday: string | null;
  gender: "female" | "male" | "other" | "unanswered" | null;
  life_vision: string | null;
  selected_pet: PetType | null;
  display_mode: DisplayMode;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Role ─────────────────────────────────────────────────────
export interface Role {
  id: string;
  user_id: string;
  category: RoleCategory;
  title: string;
  subtype: string | null;
  values: string[];
  dream: string | null;
  vision_photo_url: string | null;
  current_reality: string | null;
  gap: string | null;
  next_focus: string | null;
  three_year_goal: string | null;
  one_year_goal: string | null;
  three_month_goal: string | null;
  monthly_goal: string | null;
  weekly_goal: string | null;
  progress: number;
  is_private: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Task ─────────────────────────────────────────────────────
export type TaskStatus = "todo" | "in_progress" | "done" | "skipped";
export type Quadrant = 1 | 2 | 3 | 4;

export interface Task {
  id: string;
  user_id: string;
  role_id: string | null;
  title: string;
  description: string | null;
  purpose: string | null;
  due_date: string | null;
  estimated_minutes: number | null;
  difficulty: number | null;
  importance: number | null;
  urgency: number | null;
  quadrant: Quadrant | null;
  energy_level: EnergyLevel | null;
  emotional_mode: DayMode | null;
  status: TaskStatus;
  completed_at: string | null;
  scheduled_at: string | null;
  linked_schedule_id: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Daily Check-in ───────────────────────────────────────────
export interface DailyCheckin {
  id: string;
  user_id: string;
  mood: Mood;
  energy: EnergyLevel;
  stress_cause: StressCause;
  mode: DayMode;
  selected_role_ids: string[];
  pet_message: string | null;
  date: string;
  created_at: string;
}

// ─── Schedule ────────────────────────────────────────────────
export type ScheduleType =
  | "release"
  | "live"
  | "recording"
  | "mv_shoot"
  | "sns_post"
  | "anniversary"
  | "date"
  | "family"
  | "friend"
  | "deadline"
  | "meeting"
  | "shift"
  | "workout"
  | "hospital"
  | "sleep_goal"
  | "study"
  | "lesson"
  | "exam"
  | "self_care"
  | "rest"
  | "other";

export interface Schedule {
  id: string;
  user_id: string;
  role_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  schedule_type: ScheduleType;
  start_time: string;
  end_time: string | null;
  is_all_day: boolean;
  color: string | null;
  linked_task_id: string | null;
  shared_visibility: boolean;
  external_calendar_id: string | null;
  external_event_id: string | null;
  sync_provider: "google" | "apple" | null;
  created_at: string;
  updated_at: string;
}

// ─── SharedMember ─────────────────────────────────────────────
export type SharePermission = "view" | "comment" | "edit_tasks" | "manager";
export type ShareStatus = "pending" | "accepted" | "declined";
export type RelationshipType =
  | "manager"
  | "partner"
  | "family"
  | "friend"
  | "team"
  | "coach"
  | "teacher";

export interface SharedMember {
  id: string;
  role_id: string;
  owner_user_id: string;
  invited_email: string;
  invited_user_id: string | null;
  relationship_type: RelationshipType;
  permission: SharePermission;
  status: ShareStatus;
  created_at: string;
  updated_at: string;
}

// ─── Comment ─────────────────────────────────────────────────
export interface Comment {
  id: string;
  role_id: string | null;
  task_id: string | null;
  user_id: string;
  body: string;
  created_at: string;
}

// ─── PetMessage ──────────────────────────────────────────────
export type PetMessageType =
  | "morning"
  | "task_complete"
  | "plan_generated"
  | "behind_schedule"
  | "weekly_review"
  | "comment_received";

export interface PetMessage {
  id: string;
  user_id: string;
  pet_type: PetType;
  message_type: PetMessageType;
  body: string;
  related_task_id: string | null;
  related_role_id: string | null;
  created_at: string;
}

// ─── Today's Plan (生成結果) ──────────────────────────────────
export interface GeneratedTodayTask {
  id: string;
  role_id: string;
  role_category: RoleCategory;
  role_title: string;
  title: string;
  description?: string;
  purpose?: string;
  // Gap / Dream connections
  gap_addressed: string;
  gap_target?: string;
  related_dream?: string;
  related_long_term_goal?: string;
  related_monthly_goal?: string;
  current_reality_reference?: string;
  next_focus_reference?: string;
  long_term_connection: string;
  today_reason: string;
  emotional_adjustment_reason?: string;
  // Scoring
  estimated_minutes: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  importance: 1 | 2 | 3 | 4 | 5;
  urgency: 1 | 2 | 3 | 4 | 5;
  quadrant: Quadrant;
  action_size?: "attack" | "normal" | "small" | "minimum";
  // Metadata
  energy_adapted: boolean;
  stress_adapted: boolean;
  generated_by: "rule_based" | "openai" | "claude";
  ai_generated?: boolean;
  status: "todo" | "done" | "skipped";
  linked_schedule_id?: string;
  // Calendar suggestion
  schedule_suggestion?: {
    should_schedule: boolean;
    suggested_time_label: string;
    suggested_duration_minutes: number;
  };
}

// ─── Today Plan Result (API response) ─────────────────────────
export interface TodayPlanMeta {
  overall_message: string;
  pet_message: string;
  emotional_summary: string;
  available_time_strategy: string;
  not_today: Array<{ title: string; reason: string }>;
  reflection_question: string;
  ai_generated: boolean;
  ai_model?: string;
  prompt_version?: string;
  fallback_reason?: string;
}

export interface TodayPlanResult {
  tasks: GeneratedTodayTask[];
  meta: TodayPlanMeta;
}

// ─── Regeneration Mode ────────────────────────────────────────
export type RegenerationMode =
  | "lighter"
  | "stronger"
  | "shorter"
  | "focus_money"
  | "focus_recovery"
  | "balanced";

// ─── DailyPlan (DB) ───────────────────────────────────────────
export interface DailyPlan {
  id: string;
  user_id: string;
  date: string;
  checkin_id: string | null;
  selected_role_ids: string[];
  overall_message: string | null;
  pet_message: string | null;
  emotional_summary: string | null;
  available_time_strategy: string | null;
  reflection_question: string | null;
  not_today_json: Array<{ title: string; reason: string }>;
  ai_generated: boolean;
  ai_generation_model: string | null;
  prompt_version: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Quick Capture ────────────────────────────────────────────
export type QuickCaptureInputType = "text" | "voice";
export type QuickCaptureSaveDestination = "task" | "schedule" | "today_plan" | "inbox";

export interface ParsedQuickCapture {
  type: "task" | "schedule" | "idea" | "inbox";
  title: string;
  description?: string;
  suggested_role_id: string | null;
  suggested_role_name: string | null;
  role_inference_reason?: string;
  gap_target?: string;
  long_term_connection?: string;
  due_date?: string;
  estimated_minutes?: number;
  importance?: number;
  urgency?: number;
  quadrant?: Quadrant;
  suggested_date?: string;
  suggested_time?: string;
  suggested_duration_minutes?: number;
  confidence: "low" | "medium" | "high";
  save_destination: QuickCaptureSaveDestination;
  reasoning?: string;
  ai_generated: boolean;
  ai_model?: string;
}

export interface QuickCapture {
  id: string;
  user_id: string;
  raw_input: string;
  input_type: QuickCaptureInputType;
  transcribed_text: string | null;
  parsed_type: "task" | "schedule" | "reminder" | "idea" | "inbox" | null;
  parsed_json: ParsedQuickCapture | null;
  status: "pending" | "confirmed" | "saved" | "dismissed";
  confidence: "low" | "medium" | "high" | null;
  created_task_id: string | null;
  created_schedule_id: string | null;
  created_role_id: string | null;
  created_daily_plan_id: string | null;
  ai_provider: string | null;
  ai_model: string | null;
  prompt_version: string | null;
  created_at: string;
  updated_at: string;
}

export interface InboxItem {
  id: string;
  user_id: string;
  raw_input: string;
  title: string;
  description: string | null;
  suggested_type: "task" | "schedule" | "idea" | null;
  suggested_role_id: string | null;
  suggested_date: string | null;
  suggested_quadrant: string | null;
  suggested_gap_target: string | null;
  suggested_long_term_connection: string | null;
  status: "open" | "converted" | "archived";
  created_at: string;
  updated_at: string;
}

// ─── カレンダービュー ──────────────────────────────────────────
export type CalendarViewMode = "month" | "week" | "day" | "today";

export interface CalendarEvent {
  id: string;
  type: "schedule" | "task" | "project_task" | "goal_task";
  title: string;
  start: Date;
  end?: Date;
  isAllDay: boolean;
  roleId?: string;
  roleCategory?: RoleCategory;
  color?: string;
  sourceData: Schedule | Task | ProjectTask | GoalTask;
}

// ─── オンボーディングのフォームデータ ────────────────────────
export interface OnboardingFormData {
  birthday: string | null;
  gender: "female" | "male" | "other" | "unanswered" | null;
  selectedRoles: RoleCategory[];
  roleValues: Record<RoleCategory, string[]>;
  roleDreams: Record<
    RoleCategory,
    {
      dream: string;
      threeYearGoal: string;
      oneYearGoal: string;
      currentReality: string;
      gap: string;
    }
  >;
  visionPhotos: Record<RoleCategory, File | null>;
  selectedPet: PetType | null;
}

// ─── ロールカテゴリのカラーマッピング ────────────────────────
export const ROLE_CATEGORY_COLORS: Record<
  RoleCategory,
  { bg: string; text: string; border: string; label: string }
> = {
  creator: {
    bg: "#BDD5EA",
    text: "#2A5F8F",
    border: "#A0BDD4",
    label: "クリエイター",
  },
  health: {
    bg: "#C8DBC6",
    text: "#3A6B36",
    border: "#A8C5A5",
    label: "健康・スポーツ",
  },
  work: {
    bg: "#DCDCDA",
    text: "#555553",
    border: "#C0C0BE",
    label: "仕事・ビジネス",
  },
  relationship: {
    bg: "#EDD5CC",
    text: "#9B5A4E",
    border: "#D9B8AF",
    label: "恋愛・人間関係",
  },
  learning: {
    bg: "#D8CDE8",
    text: "#6B4E9B",
    border: "#C0B0D6",
    label: "学び・未来",
  },
  selfcare: {
    bg: "#E8DDD0",
    text: "#8B6E4E",
    border: "#D4C4B0",
    label: "自分のケア",
  },
};

export const ROLE_CATEGORY_LABELS: Record<RoleCategory, string> = {
  creator: "クリエイター",
  health: "健康・スポーツ",
  work: "仕事・ビジネス",
  relationship: "恋愛・人間関係",
  learning: "学び・未来",
  selfcare: "自分のケア",
};

export const MOOD_LABELS: Record<Mood, string> = {
  good: "良い",
  normal: "普通",
  anxious: "不安",
  rushed: "焦り",
  unmotivated: "無気力",
  angry: "怒り",
  sad: "悲しい",
};

export const MODE_LABELS: Record<DayMode, string> = {
  attack: "攻める日",
  progress: "進める日",
  maintain: "整える日",
  protect: "守る日",
  recover: "回復日",
};

export const STRESS_LABELS: Record<StressCause, string> = {
  money: "お金",
  time: "時間不足",
  relationship: "人間関係",
  perfectionism: "完璧主義",
  body: "体調",
  future_anxiety: "将来不安",
  decision_fatigue: "決断疲れ",
  other: "その他",
};

// ─── Project ──────────────────────────────────────────────────
export type ProjectStatus = "planning" | "active" | "completed" | "paused" | "archived";
export type ProjectType = "event" | "release" | "health" | "learning" | "business" | "custom";
export type TaskImportance = "low" | "medium" | "high";
export type ProjectTaskStatus = "todo" | "doing" | "done" | "skipped";

export interface Project {
  id: string;
  user_id: string;
  role_id: string | null;
  title: string;
  description: string | null;
  project_type: ProjectType;
  goal: string | null;
  target_date: string | null;
  status: ProjectStatus;
  progress: number;
  success_metric: string | null;
  budget: number | null;
  revenue_goal: number | null;
  current_state: string | null;
  missing_info: string | null;
  priority_focus: string | null;
  ai_generated: boolean;
  ai_generation_model: string | null;
  prompt_version: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectTask {
  id: string;
  user_id: string;
  project_id: string;
  role_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  start_time: string | null;
  end_time: string | null;
  estimated_minutes: number | null;
  importance: TaskImportance | null;
  urgency: TaskImportance | null;
  quadrant: number | null;
  status: ProjectTaskStatus;
  dependency_task_id: string | null;
  ai_reason: string | null;
  created_task_id: string | null;
  created_schedule_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIProjectTask {
  title: string;
  description: string;
  due_date: string;
  estimated_minutes: number;
  importance: TaskImportance;
  urgency: TaskImportance;
  quadrant: number;
  should_schedule: boolean;
  suggested_start_time: string | null;
  suggested_end_time: string | null;
  reason: string;
  dependency: string | null;
}

export interface AIProjectBreakdown {
  project_title: string;
  project_type: ProjectType;
  target_date: string;
  summary: string;
  success_metrics: string[];
  missing_info_questions: string[];
  tasks: AIProjectTask[];
  today_first_action: {
    title: string;
    estimated_minutes: number;
    reason: string;
  };
}

// ─── Daily Reflection ─────────────────────────────────────────
export type MoodType = "great" | "good" | "okay" | "tired" | "rough";

export interface DailyReflection {
  id: string;
  user_id: string;
  date: string;
  log_text: string | null;
  role_id: string | null;
  mood: MoodType | null;
  created_at: string;
  updated_at: string;
}

// ─── Daily Log (1mm日記) ─────────────────────────────────────
export interface DailyLog {
  id: string;
  user_id: string;
  date: string;
  mood_after: MoodType | null;
  one_line_diary: string | null;
  roles_grown: string[] | null;
  exercise_minutes: number;
  english_minutes: number;
  creator_minutes: number;
  work_minutes: number;
  study_minutes: number;
  sleep_hours: number | null;
  weather: string | null;
  temperature: number | null;
  location: string | null;
  weather_provider: string | null;
  weather_fetched_at: string | null;
  photo_url: string | null;
  tomorrow_note: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Milestone（達成記録）──────────────────────────────────────
export interface Milestone {
  id: string;
  user_id: string;
  role_id: string | null;
  category: RoleCategory;
  title: string;
  description: string | null;
  achieved_date: string;
  created_at: string;
  updated_at: string;
}

// ─── Goal（スマートゴール）────────────────────────────────────
export type GoalCategory = "music_event" | "release" | "collab" | "other";

export const GOAL_CATEGORY_CONFIG: Record<
  GoalCategory,
  { label: string; emoji: string; bg: string; text: string }
> = {
  music_event: { label: "音楽イベント", emoji: "🎵", bg: "#BDD5EA", text: "#2A5F8F" },
  release:     { label: "CDリリース",   emoji: "💿", bg: "#EDD5CC", text: "#9B5A4E" },
  collab:      { label: "コラボ企画",   emoji: "🤝", bg: "#D8CDE8", text: "#6B4E9B" },
  other:       { label: "その他",       emoji: "✨", bg: "#E8DDD0", text: "#8B6E4E" },
};

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  category: GoalCategory;
  event_date: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoalTask {
  id: string;
  goal_id: string;
  user_id: string;
  title: string;
  due_date: string | null;
  is_completed: boolean;
  sort_order: number;
  created_at: string;
}
