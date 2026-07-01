"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowRight, Plus, Sparkles, Moon, Sun, Inbox, X, Trash2, ChevronDown, Target, ChevronRight, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  UserProfile, Role, DailyCheckin, Task, Schedule, ProjectTask, DailyLog, MoodType,
  PetType, EnergyLevel, DayMode, DisplayMode, ROLE_CATEGORY_COLORS, MODE_LABELS, TaskStatus,
  Goal, GOAL_CATEGORY_CONFIG, GoalCategory,
} from "@/types";
import { MOOD_EMOJI } from "@/components/daily-log/DailyLogForm";

// ─── 定数 ──────────────────────────────────────────────────────

const ROLE_EMOJI: Record<string, string> = {
  creator: "🎵", health: "🌿", work: "💼",
  relationship: "💛", learning: "🌍", selfcare: "🕯",
};

const MODE_CONFIG: Record<DayMode, { emoji: string; accentColor: string }> = {
  attack:   { emoji: "⚡", accentColor: "#E8C85A" },
  progress: { emoji: "🚀", accentColor: "#7BBFEA" },
  maintain: { emoji: "🌿", accentColor: "#8FA888" },
  protect:  { emoji: "🛡", accentColor: "#B8A0C8" },
  recover:  { emoji: "🌙", accentColor: "#D4A898" },
};

const ENERGY_HOURS: Record<EnergyLevel, Record<DayMode, string>> = {
  10:  { attack: "約1時間",    progress: "約1時間",    maintain: "約1時間",    protect: "約30分",    recover: "約30分"   },
  40:  { attack: "約3時間",    progress: "約2.5時間",  maintain: "約2時間",    protect: "約1.5時間", recover: "約1時間"  },
  70:  { attack: "約6時間",    progress: "約5時間",    maintain: "約4時間",    protect: "約3時間",   recover: "約2時間"  },
  100: { attack: "約8時間",    progress: "約7時間",    maintain: "約6時間",    protect: "約5時間",   recover: "約3時間"  },
};

const ENERGY_LABELS: Record<EnergyLevel, string> = {
  10: "低", 40: "やや低", 70: "普通", 100: "高い",
};

const QUADRANT_INFO: Record<number, { label: string; color: string }> = {
  1: { label: "重要・緊急", color: "#F5CCC8" },
  2: { label: "重要",       color: "#C8DBC6" },
  3: { label: "緊急",       color: "#BDD5EA" },
  4: { label: "低優先",     color: "#E0DDD8" },
};

const EASY_ROLE_LABELS: Record<string, string> = {
  creator:      "つくること",
  health:       "からだ",
  work:         "しごと",
  relationship: "たいせつな人",
  learning:     "まなぶこと",
  selfcare:     "じぶんを大切に",
};

type ActivityKey = "exercise_minutes" | "study_minutes" | "english_minutes" | "creator_minutes" | "work_minutes";

const ACTIVITY_CONFIG: { key: ActivityKey; label: string; emoji: string; bg: string }[] = [
  { key: "exercise_minutes", label: "運動", emoji: "🏃", bg: "#C8DBC6" },
  { key: "study_minutes",    label: "勉強", emoji: "📚", bg: "#EDD5CC" },
  { key: "english_minutes",  label: "英語", emoji: "🌍", bg: "#D8CDE8" },
  { key: "creator_minutes",  label: "制作", emoji: "🎵", bg: "#BDD5EA" },
  { key: "work_minutes",     label: "仕事", emoji: "💼", bg: "#DCDCDA" },
];

const MOODS: { value: MoodType; emoji: string; label: string }[] = [
  { value: "great", emoji: "🌟", label: "最高" },
  { value: "good",  emoji: "😊", label: "良い" },
  { value: "okay",  emoji: "😐", label: "普通" },
  { value: "tired", emoji: "😴", label: "疲れ" },
  { value: "rough", emoji: "😔", label: "辛い" },
];

// ─── 統合タスク型 ──────────────────────────────────────────────

type UnifiedTask = {
  id: string;
  title: string;
  status: string;
  quadrant: number | null;
  estimated_minutes: number | null;
  role_id: string | null;
  source: "task" | "project_task" | "goal_task";
  goal_title?: string;
};

// ─── ペットメッセージ ──────────────────────────────────────────

function buildContextMessage(
  checkin: DailyCheckin | null,
  undoneCount: number,
  doneCount: number,
  hour: number,
): string {
  if (doneCount > 0 && undoneCount === 0) return "今日のTODOを全部こなした。今日も夢に戻れたね。";
  if (doneCount > 0) return `${doneCount}件進んだ。残り${undoneCount}件、小さく続けよう。`;
  if (!checkin) return "今日の気分を教えて。それに合わせてプランを整えるよ。";
  const { mode, energy } = checkin;
  if (mode === "recover") return "整える日も前進。夢との線を切らない小さな行動でOK。";
  if (mode === "protect") return "守る日。一番大事なRoleだけ守ろう。今日も戻れた、それが前進。";
  if (energy <= 10) return "エネルギーは低め。一番大事な1つだけやれば十分。それで今日は勝ち。";
  if (mode === "attack" && energy >= 70) return `今日は攻める日。エネルギー全開でいこう。`;
  if (undoneCount === 0) return "今日のTODOがまだないよ。プランを作って始めよう。";
  return `今日は${undoneCount}つだけ。シンプルに進もう。`;
}

// ─── TODOアイテムコンポーネント ────────────────────────────────

type TodoItemProps = {
  task: UnifiedTask;
  role: Role | null;
  displayMode: DisplayMode;
  onToggle: () => void;
  onDelete: () => void;
};

function TodoItem({ task, role, displayMode, onToggle, onDelete }: TodoItemProps) {
  const colors = role ? ROLE_CATEGORY_COLORS[role.category] : null;
  const qInfo = QUADRANT_INFO[task.quadrant ?? 1];
  const isDone = task.status === "done";
  const isSimple = displayMode === "simple";

  return (
    <div className="px-4 py-3.5 border-b border-mist last:border-0">
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5"
          style={{
            borderColor: isDone ? "#9DBF98" : colors?.border || "#D8D5CC",
            backgroundColor: isDone ? "#9DBF98" : "transparent",
          }}
        >
          {isDone && <span className="text-white text-[9px] font-bold">✓</span>}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm leading-snug ${isDone ? "line-through text-muted-foreground/60" : "text-charcoal font-medium"}`}>
            {task.source === "project_task" && <span className="mr-1 text-[11px]">🎯</span>}
            {task.source === "goal_task" && <span className="mr-1 text-[11px]">🏆</span>}
            {task.title}
          </p>
          {!isDone && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
              {task.estimated_minutes && (
                <span className="text-[10px] text-muted-foreground">{task.estimated_minutes}分</span>
              )}
              {role && (
                <span className="text-[10px] text-muted-foreground">
                  {ROLE_EMOJI[role.category]}{" "}
                  {isSimple ? EASY_ROLE_LABELS[role.category] || role.title : role.title}
                </span>
              )}
              {task.source === "goal_task" && task.goal_title && (
                <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded-full">
                  🏆 {task.goal_title}
                </span>
              )}
              {!isSimple && role?.gap && task.source !== "goal_task" && (
                <span className="text-[10px] text-muted-foreground/70 truncate max-w-[200px]">
                  Gap: {role.gap.length > 28 ? role.gap.slice(0, 28) + "…" : role.gap}
                </span>
              )}
              {!isSimple && (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: qInfo.color, color: "#444" }}
                >
                  {qInfo.label}
                </span>
              )}
            </div>
          )}
        </div>

        <button onClick={onDelete} className="shrink-0 p-1 rounded-lg active:bg-red-50 mt-0.5">
          <Trash2 className="w-3.5 h-3.5 text-muted-foreground/30" />
        </button>
      </div>
    </div>
  );
}

// ─── メインコンポーネント ──────────────────────────────────────

export default function HomePage() {
  const supabase = createClient();

  // ─ データ
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [checkin, setCheckin] = useState<DailyCheckin | null>(null);
  const [weekSchedules, setWeekSchedules] = useState<Schedule[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [todayProjectTasks, setTodayProjectTasks] = useState<ProjectTask[]>([]);
  const [inboxCount, setInboxCount] = useState(0);
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [weekLogs, setWeekLogs] = useState<DailyLog[]>([]);

  // ─ UI
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newQuadrant, setNewQuadrant] = useState<1 | 2 | 3>(1);
  const [isAdding, setIsAdding] = useState(false);
  const [showDoneTasks, setShowDoneTasks] = useState(false);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("simple");
  const [goals, setGoals] = useState<(Goal & { taskCount: number; completedCount: number })[]>([]);
  const [aiPhase, setAiPhase] = useState<"idle" | "selecting" | "generating" | "done">("idle");
  const [planSelectedRoleIds, setPlanSelectedRoleIds] = useState<string[]>([]);
  const [aiPlanError, setAiPlanError] = useState<string | null>(null);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [todayGoalTasks, setTodayGoalTasks] = useState<Array<{ id: string; title: string; is_completed: boolean; goal_title: string; role_id: string | null }>>([]);
  const [dataLoaded, setDataLoaded] = useState(false);


  const today = new Date();
  const hour = today.getHours();
  const isEvening = hour >= 18;
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayStr = format(today, "yyyy-MM-dd");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const weekEndStr = format(addDays(weekStart, 6), "yyyy-MM-dd");

      const [{ data: p }, { data: r }, { data: c }, { data: s }, { data: t }, { count: ic }, { data: pt }, { data: gtRaw }] = await Promise.all([
        supabase.from("users_profile").select("name,selected_pet,life_vision,display_mode").eq("user_id", user.id).single(),
        supabase.from("roles").select("id,title,category,dream,gap,monthly_goal,vision_photo_url,values,progress").eq("user_id", user.id).order("display_order").limit(6),
        supabase.from("daily_checkins").select("*").eq("user_id", user.id).eq("date", todayStr).maybeSingle(),
        supabase.from("schedules").select("id,title,start_time,role_id,is_all_day")
          .eq("user_id", user.id)
          .gte("start_time", `${weekStartStr}T00:00:00`)
          .lte("start_time", `${weekEndStr}T23:59:59`),
        supabase.from("tasks").select("*").eq("user_id", user.id).eq("due_date", todayStr).order("quadrant").limit(30),
        supabase.from("inbox_items").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "open"),
        supabase.from("project_tasks").select("*").eq("user_id", user.id).eq("due_date", todayStr).neq("status", "skipped").order("quadrant"),
        supabase.from("goal_tasks").select("*, goals(title, role_id)").eq("user_id", user.id).eq("due_date", todayStr).eq("is_completed", false),
      ]);

      setProfile(p as unknown as UserProfile);
      if ((p as unknown as UserProfile)?.display_mode) {
        setDisplayMode((p as unknown as UserProfile).display_mode);
      }
      setRoles((r || []) as unknown as Role[]);
      setCheckin(c);
      setWeekSchedules((s || []) as unknown as Schedule[]);
      setTodayTasks(t || []);
      setTodayProjectTasks((pt || []) as ProjectTask[]);
      setInboxCount(ic ?? 0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTodayGoalTasks((gtRaw || []).map((t: any) => ({ id: t.id, title: t.title, is_completed: t.is_completed, goal_title: t.goals?.title || "ゴール", role_id: t.goals?.role_id || null })));

      const { data: lg } = await supabase.from("daily_logs")
        .select("*").eq("user_id", user.id).eq("date", todayStr).maybeSingle();
      if (lg) setTodayLog(lg as DailyLog);

      const { data: wl } = await supabase.from("daily_logs")
        .select("*").eq("user_id", user.id)
        .gte("date", weekStartStr).lte("date", weekEndStr);
      setWeekLogs((wl || []) as DailyLog[]);
      setDataLoaded(true);
    }
    load();
    // ゴール取得
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("goals").select("*, goal_tasks(id, is_completed)")
        .eq("user_id", user.id).eq("is_completed", false)
        .order("event_date", { ascending: true }).limit(3)
        .then(({ data: gs }) => {
          setGoals((gs || []).map((g: any) => ({
            ...g,
            taskCount: (g.goal_tasks || []).length,
            completedCount: (g.goal_tasks || []).filter((t: any) => t.is_completed).length,
          })));
        });
    });
  }, []);

  // ─── Derived ──────────────────────────────────────────────────

  const allUndone: UnifiedTask[] = [
    ...todayTasks.filter(t => t.status !== "done").map(t => ({ id: t.id, title: t.title, status: t.status, quadrant: t.quadrant ?? null, estimated_minutes: t.estimated_minutes ?? null, role_id: t.role_id ?? null, source: "task" as const })),
    ...todayProjectTasks.filter(t => t.status !== "done").map(t => ({ id: t.id, title: t.title, status: t.status, quadrant: t.quadrant ?? null, estimated_minutes: t.estimated_minutes ?? null, role_id: t.role_id ?? null, source: "project_task" as const })),
    ...todayGoalTasks.map(t => ({ id: t.id, title: t.title, status: "todo", quadrant: 1 as number | null, estimated_minutes: null, role_id: null, source: "goal_task" as const, goal_title: t.goal_title })),
  ].sort((a, b) => (a.quadrant ?? 4) - (b.quadrant ?? 4));

  const allDone: UnifiedTask[] = [
    ...todayTasks.filter(t => t.status === "done").map(t => ({ id: t.id, title: t.title, status: t.status, quadrant: t.quadrant ?? null, estimated_minutes: t.estimated_minutes ?? null, role_id: t.role_id ?? null, source: "task" as const })),
    ...todayProjectTasks.filter(t => t.status === "done").map(t => ({ id: t.id, title: t.title, status: t.status, quadrant: t.quadrant ?? null, estimated_minutes: t.estimated_minutes ?? null, role_id: t.role_id ?? null, source: "project_task" as const })),
  ];

  const top3 = showAllTasks ? allUndone : allUndone.slice(0, 3);

  const roleWeekCount: Record<string, number> = {};
  weekSchedules.forEach(s => {
    if (s.role_id) roleWeekCount[s.role_id] = (roleWeekCount[s.role_id] || 0) + 1;
  });

  const petType = (profile?.selected_pet || "cat") as PetType;
  const modeInfo = checkin?.mode ? MODE_CONFIG[checkin.mode] : null;
  const modeLabel = checkin?.mode ? MODE_LABELS[checkin.mode] : null;
  const availableHours = checkin?.energy && checkin?.mode ? ENERGY_HOURS[checkin.energy][checkin.mode] : null;
  const contextMessage = buildContextMessage(checkin, allUndone.length, allDone.length, hour);

  const weekDayTotals = weekDays.map((day) => {
    const log = weekLogs.find((l) => isSameDay(new Date(l.date), day));
    const total = log
      ? ACTIVITY_CONFIG.reduce((sum, a) => sum + ((log[a.key] as number) || 0), 0)
      : 0;
    return { day, total };
  });
  const weekChartMax = Math.max(...weekDayTotals.map((d) => d.total), 60);
  const weekTotalMinutes = weekDayTotals.reduce((sum, d) => sum + d.total, 0);

  // ─── ヘルパー ──────────────────────────────────────────────────

  function getSchedulesForDay(day: Date) {
    return weekSchedules.filter(s => isSameDay(new Date(s.start_time), day));
  }

  function getRoleForId(roleId: string | null) {
    return roles.find(r => r.id === roleId) || null;
  }

  // ─── アクション ────────────────────────────────────────────────

  async function recalculateRoleProgress(roleId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: gs } = await supabase.from("goals").select("goal_tasks(is_completed)").eq("role_id", roleId).eq("user_id", user.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allTasks = (gs || []).flatMap((g: any) => g.goal_tasks || []);
    const total = allTasks.length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completed = allTasks.filter((t: any) => t.is_completed).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    await supabase.from("roles").update({ progress }).eq("id", roleId);
    setRoles(prev => prev.map(r => r.id === roleId ? { ...r, progress } : r));
  }

  async function toggleDone(taskId: string, source: "task" | "project_task" | "goal_task") {
    if (source === "goal_task") {
      const task = todayGoalTasks.find(t => t.id === taskId);
      if (!task) return;
      const newCompleted = !task.is_completed;
      await supabase.from("goal_tasks").update({ is_completed: newCompleted }).eq("id", taskId);
      if (newCompleted) {
        setTodayGoalTasks(prev => prev.filter(t => t.id !== taskId));
      } else {
        setTodayGoalTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: newCompleted } : t));
      }
      if (task.role_id) recalculateRoleProgress(task.role_id);
      return;
    }
    if (source === "task") {
      const task = todayTasks.find(t => t.id === taskId);
      if (!task) return;
      const newStatus: TaskStatus = task.status === "done" ? "todo" : "done";
      await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
      setTodayTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } else {
      const task = todayProjectTasks.find(t => t.id === taskId);
      if (!task) return;
      const newStatus = task.status === "done" ? "todo" : "done";
      await supabase.from("project_tasks").update({ status: newStatus }).eq("id", taskId);
      setTodayProjectTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as ProjectTask["status"] } : t));
    }
  }

  async function deleteItem(taskId: string, source: "task" | "project_task" | "goal_task") {
    if (source === "goal_task") return; // ゴールタスクはゴール詳細から管理
    if (source === "task") {
      await supabase.from("tasks").delete().eq("id", taskId);
      setTodayTasks(prev => prev.filter(t => t.id !== taskId));
    } else {
      await supabase.from("project_tasks").delete().eq("id", taskId);
      setTodayProjectTasks(prev => prev.filter(t => t.id !== taskId));
    }
  }



  async function generatePlan() {
    if (!checkin || planSelectedRoleIds.length === 0) return;
    setAiPhase("generating");
    setAiPlanError(null);
    try {
      const res = await fetch("/api/ai/generate-today-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedRoleIds: planSelectedRoleIds, todayStr }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setAiPlanError((err as { error?: string }).error ?? "プランの生成に失敗しました");
        setAiPhase("idle");
        return;
      }
      const result = await res.json() as { tasks: Array<{ role_id: string; title: string; long_term_connection?: string; estimated_minutes?: number; quadrant: number }>; };
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("tasks").delete().eq("user_id", user.id).eq("due_date", todayStr);
        const tasksToSave = result.tasks.filter(t => t.quadrant !== 4).map(t => ({
          user_id: user.id,
          role_id: t.role_id,
          title: t.title,
          purpose: t.long_term_connection || null,
          due_date: todayStr,
          estimated_minutes: t.estimated_minutes || null,
          quadrant: t.quadrant,
          status: "todo" as const,
        }));
        if (tasksToSave.length > 0) {
          const { data: inserted } = await supabase.from("tasks").insert(tasksToSave).select();
          setTodayTasks((inserted || []) as Task[]);
        } else {
          setTodayTasks([]);
        }
      }
      setAiPhase("done");
    } catch {
      setAiPlanError("プランの生成に失敗しました");
      setAiPhase("idle");
    }
  }

  async function addTask() {
    if (!newTitle.trim()) return;
    setIsAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: inserted } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: newTitle.trim(),
      quadrant: newQuadrant,
      due_date: todayStr,
      status: "todo",
    }).select().single();
    if (inserted) setTodayTasks(prev => [...prev, inserted as Task]);
    setNewTitle("");
    setNewQuadrant(1);
    setShowAddForm(false);
    setIsAdding(false);
  }


  // ─── レンダリング ──────────────────────────────────────────────

  return (
    <>
    {/* ─── ロール未作成 空 state ─── */}
    {dataLoaded && roles.length === 0 && (
      <div className="fixed inset-0 bg-ivory z-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-24 h-24 rounded-3xl bg-sage/15 flex items-center justify-center text-5xl mb-6">🌟</div>
        <h2 className="text-2xl font-medium text-charcoal mb-2">さあ、はじめよう</h2>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          あなたの「Role」を作ると<br />夢から今日のやることが<br />自動でつながります
        </p>
        <Link
          href="/roles/new"
          className="w-full max-w-xs py-4 rounded-2xl bg-sage text-white font-medium text-sm text-center block mb-3"
        >
          最初のRoleを作る
        </Link>
        <p className="text-xs text-muted-foreground">
          例：ミュージシャン、クリエイター、会社員…
        </p>
      </div>
    )}
    <div className="px-5 pt-safe pt-5 pb-10 space-y-4">

      {/* ① 日付 + ペット */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground tracking-widest uppercase">
            {format(today, "yyyy", { locale: ja })}
          </p>
          <h1 className="text-[28px] font-medium text-charcoal leading-none mt-0.5">
            {format(today, "M月d日", { locale: ja })}
            <span className="text-base text-muted-foreground font-normal ml-1.5">
              {format(today, "（E）", { locale: ja })}
            </span>
          </h1>
          <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed max-w-[230px]">
            {contextMessage}
          </p>
        </div>
        <Link href="/checkin" className="shrink-0">
          <div className="w-14 h-14 rounded-3xl bg-sage/12 flex items-center justify-center text-[28px]">
            {petType === "cat" ? "🐱" : petType === "dog" ? "🐶" : "🤖"}
          </div>
        </Link>
      </motion.div>

      {/* ② 今日の状態カード */}
      <AnimatePresence mode="wait">
        {!checkin ? (
          <motion.div key="cta" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
            <Link href="/checkin">
              <div className="bg-white rounded-3xl px-5 py-4 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-transform">
                <div className="w-11 h-11 rounded-2xl bg-blush/50 flex items-center justify-center text-xl shrink-0">💭</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal">今日の気分をチェックイン</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">感情に合わせてプランを作ります</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            </Link>
          </motion.div>
        ) : (
          <motion.div key="status" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
            <div className="rounded-3xl px-5 py-4 shadow-sm" style={{ background: modeInfo ? `linear-gradient(135deg, white 60%, ${modeInfo.accentColor}22)` : "white" }}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: modeInfo ? modeInfo.accentColor + "30" : "#F0EEE9" }}>
                  {modeInfo?.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-charcoal">{modeLabel}</span>
                    <span className="text-[10px] text-muted-foreground">エネルギー: {ENERGY_LABELS[checkin.energy]}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-mist rounded-full overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: modeInfo?.accentColor || "#8FA888" }}
                        initial={{ width: 0 }} animate={{ width: `${checkin.energy}%` }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }} />
                    </div>
                    <span className="text-[10px] text-charcoal font-medium shrink-0">{checkin.energy}%</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground">使える時間</p>
                  <p className="text-sm font-medium text-charcoal">{availableHours}</p>
                </div>
              </div>
              <Link href="/checkin" className="flex items-center justify-end mt-2.5">
                <span className="text-[11px] text-sage">変更する</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ③ 今日のTODO TOP 3 */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-medium text-charcoal">
            今日のTODO
          </h2>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAddForm(v => !v)} className="flex items-center gap-0.5 text-[11px] text-sage">
              <Plus className="w-3.5 h-3.5" />追加
            </button>
            <button
              onClick={() => setAiPhase(p => p === "selecting" ? "idle" : "selecting")}
              className="flex items-center gap-1 text-[11px] text-sage font-medium"
            >
              <Sparkles className="w-3 h-3" />{aiPhase === "done" ? "再生成" : "AIプラン"}
            </button>
          </div>
        </div>


        {/* AI Plan Generation Section */}
        <AnimatePresence>
          {(aiPhase === "selecting" || aiPhase === "generating") && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-3"
            >
              {aiPlanError && (
                <div className="mb-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <p className="text-[11px] text-amber-700 flex-1">{aiPlanError}</p>
                  <button onClick={() => setAiPlanError(null)} className="text-amber-400 text-xs">✕</button>
                </div>
              )}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                {!checkin ? (
                  <Link href="/checkin" className="text-sm text-sage text-center block">チェックインが必要です →</Link>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-3">集中するRoleを選んでください（最大3つ）</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {roles.map(role => {
                        const isSelected = planSelectedRoleIds.includes(role.id);
                        const isDisabled = !isSelected && planSelectedRoleIds.length >= 3;
                        const colors = ROLE_CATEGORY_COLORS[role.category];
                        return (
                          <button
                            key={role.id}
                            onClick={() => {
                              if (isSelected) setPlanSelectedRoleIds(ids => ids.filter(id => id !== role.id));
                              else if (!isDisabled) setPlanSelectedRoleIds(ids => [...ids, role.id]);
                            }}
                            disabled={isDisabled || aiPhase === "generating"}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs border-2 transition-all disabled:opacity-40"
                            style={isSelected
                              ? { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text, fontWeight: 500 }
                              : { borderColor: "transparent", backgroundColor: "#F0EEE9", color: "#888" }}
                          >
                            <span>{ROLE_EMOJI[role.category]}</span>
                            <span>{role.title}</span>
                            {isSelected && <span>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={generatePlan}
                      disabled={planSelectedRoleIds.length === 0 || aiPhase === "generating"}
                      className="w-full py-3 rounded-2xl bg-sage text-white text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {aiPhase === "generating"
                        ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />AIがプランを生成中...</>
                        : <><Sparkles className="w-4 h-4" />AIで今日のプランを作る</>
                      }
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Plan saved banner */}
        <AnimatePresence>
          {aiPhase === "done" && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-3 bg-sage/10 border border-sage/20 rounded-2xl px-4 py-2.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="text-sage text-sm">✓</span>
                <span className="text-sm text-sage font-medium">プランを保存しました</span>
              </div>
              <button onClick={() => setAiPhase("idle")} className="text-sage/60 text-xs">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 手動追加フォーム */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addTask()} placeholder="タスクを入力…" autoFocus
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage/30" />
                <div className="flex gap-2">
                  {([{ q: 1, label: "重要・緊急", color: "#F5CCC8" }, { q: 2, label: "重要", color: "#C8DBC6" }, { q: 3, label: "緊急", color: "#BDD5EA" }] as const).map(({ q, label, color }) => (
                    <button key={q} onClick={() => setNewQuadrant(q)}
                      className="flex-1 py-1.5 rounded-xl text-[10px] font-medium transition-all border"
                      style={{ backgroundColor: newQuadrant === q ? color : "transparent", borderColor: newQuadrant === q ? color : "#E0DDD8", color: newQuadrant === q ? "#444" : "#999" }}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={addTask} disabled={!newTitle.trim() || isAdding}
                    className="flex-1 py-2 rounded-xl bg-sage text-white text-sm font-medium disabled:opacity-40">追加</button>
                  <button onClick={() => { setShowAddForm(false); setNewTitle(""); }}
                    className="w-10 py-2 rounded-xl border border-border flex items-center justify-center">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {top3.length === 0 && allDone.length === 0 ? (
          <button onClick={() => { if (!checkin) { window.location.href = "/checkin"; } else { setAiPhase(p => p === "selecting" ? "idle" : "selecting"); } }} className="w-full">
            <div className="bg-white rounded-3xl p-6 text-center shadow-sm active:scale-[0.98] transition-transform">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm font-medium text-charcoal">まだ今日のTODOがありません</p>
              <p className="text-[11px] text-muted-foreground mt-1 mb-3">
                {checkin ? "AIで今日のプランを作って保存しよう" : "まずチェックインして気分を教えよう"}
              </p>
              <span className="text-[11px] text-sage">
                {checkin ? "AIプランを作る →" : "チェックインする →"}
              </span>
            </div>
          </button>
        ) : (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {top3.map(task => (
              <TodoItem
                key={`${task.source}-${task.id}`}
                task={task}
                role={getRoleForId(task.role_id)}
                displayMode={displayMode}
                onToggle={() => toggleDone(task.id, task.source)}
                onDelete={() => deleteItem(task.id, task.source)}
              />
            ))}

            {allUndone.length > 3 && (
              <div className="px-4 py-2.5 border-t border-mist">
                <button onClick={() => setShowAllTasks(true)} className="text-[11px] text-sage flex items-center gap-1">
                  他{allUndone.length - 3}件のTODOを見る <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {allDone.length > 0 && (
              <div className="border-t border-mist">
                <button onClick={() => setShowDoneTasks(v => !v)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>✓ {allDone.length}件完了　タップで見る</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDoneTasks ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {showDoneTasks && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      {allDone.map(task => (
                        <TodoItem
                          key={`done-${task.source}-${task.id}`}
                          task={task}
                          role={getRoleForId(task.role_id)}
                          displayMode={displayMode}
                          onToggle={() => toggleDone(task.id, task.source)}
                          onDelete={() => deleteItem(task.id, task.source)}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* ゴール */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }} className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-sage" />
            <h2 className="text-[13px] font-medium text-charcoal">ゴール</h2>
          </div>
          <Link href="/goals" className="flex items-center gap-0.5 text-[11px] text-sage">
            <Plus className="w-3.5 h-3.5" />追加・一覧
          </Link>
        </div>
        {goals.length === 0 ? (
          <Link href="/goals">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3 active:scale-[0.98] transition-transform">
              <span className="text-lg">🎯</span>
              <p className="text-xs text-muted-foreground flex-1">ゴールを追加して逆算タスクを作ろう</p>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
            </div>
          </Link>
        ) : (
          <div className="space-y-2">
            {goals.map((g) => {
              const config = GOAL_CATEGORY_CONFIG[g.category as GoalCategory] ?? GOAL_CATEGORY_CONFIG.other;
              const progress = g.taskCount > 0 ? Math.round((g.completedCount / g.taskCount) * 100) : 0;
              const daysLeft = Math.ceil((new Date(g.event_date + "T00:00:00").getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              return (
                <Link key={g.id} href={`/goals/${g.id}`}>
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3 active:scale-[0.98] transition-transform">
                    <span className="text-base shrink-0">{config.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-charcoal truncate">{g.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 rounded-full bg-mist overflow-hidden">
                          <div className="h-full rounded-full bg-sage" style={{ width: `${progress}%` }} />
                        </div>
                        <span className={`text-[10px] shrink-0 ${daysLeft <= 7 ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                          あと{daysLeft}日
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ④ 今日のRole Plan（コンパクト展開式） */}
      {roles.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[13px] font-medium text-charcoal">
              {displayMode === "simple" ? "やりたいことリスト" : "Role Plan"}
            </h2>
            <Link href="/roles" className="flex items-center gap-0.5 text-[11px] text-sage">
              すべて <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {roles.slice(0, 3).map(role => {
              const colors = ROLE_CATEGORY_COLORS[role.category];
              const isExpanded = expandedRoleId === role.id;
              return (
                <div key={role.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  <button
                    onClick={() => setExpandedRoleId(isExpanded ? null : role.id)}
                    className="w-full text-left"
                  >
                    <div className="flex">
                      <div className="w-1 shrink-0" style={{ backgroundColor: colors.border }} />
                      <div className="flex-1 px-4 py-3.5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-lg leading-none">{ROLE_EMOJI[role.category]}</span>
                          <span className="text-sm font-medium text-charcoal flex-1">
                            {displayMode === "simple" ? EASY_ROLE_LABELS[role.category] || role.title : role.title}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                        {role.monthly_goal && (
                          <p className="text-[11px] text-charcoal mb-1.5">
                            <span className="text-muted-foreground">今月: </span>
                            {role.monthly_goal.length > 42 ? role.monthly_goal.slice(0, 42) + "…" : role.monthly_goal}
                          </p>
                        )}
                        {role.gap && displayMode === "detail" && (
                          <div className="rounded-lg px-2.5 py-1.5" style={{ backgroundColor: colors.bg + "70" }}>
                            <p className="text-[10px]" style={{ color: colors.text }}>
                              Gap: {role.gap.length > 50 ? role.gap.slice(0, 50) + "…" : role.gap}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && role.dream && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 py-3 border-t border-mist bg-mist/30">
                          <p className="text-[10px] text-muted-foreground mb-1">夢・ビジョン</p>
                          <p className="text-[12px] text-charcoal leading-relaxed">{role.dream}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex border-t border-mist">
                    <Link href={`/roles/${role.id}`}
                      className="flex-1 py-2.5 text-center text-[11px] text-sage border-r border-mist">
                      詳細を見る
                    </Link>
                    <button
                      onClick={() => { setAiPhase(p => p === "selecting" ? "idle" : "selecting"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="flex-1 py-2.5 text-center text-[11px] text-muted-foreground"
                    >
                      AIプランを作る
                    </button>
                  </div>
                </div>
              );
            })}
            {roles.length > 3 && (
              <Link href="/roles" className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground py-1">
                他{roles.length - 3}つのRoleを見る <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        </motion.div>
      )}

      {/* ⑤ 今週の時間割 */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-medium text-charcoal">今週の時間割</h2>
          <Link href="/calendar" className="flex items-center gap-0.5 text-[11px] text-sage">
            カレンダー <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="bg-white rounded-3xl px-4 py-4 shadow-sm">
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-2" style={{ minWidth: "calc(7 * 46px + 6 * 8px)" }}>
              {weekDays.map((day, i) => {
                const daySchedules = getSchedulesForDay(day);
                const isTodayDay = isToday(day);
                const isPast = day < today && !isTodayDay;
                return (
                  <Link key={i} href={`/calendar?date=${format(day, "yyyy-MM-dd")}`}
                    className="flex flex-col items-center gap-1.5 flex-1" style={{ minWidth: "46px" }}>
                    <span className={`text-[10px] font-medium ${isTodayDay ? "text-sage" : isPast ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                      {format(day, "E", { locale: ja })}
                    </span>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all ${isTodayDay ? "bg-sage text-white" : isPast ? "text-muted-foreground/40" : "text-charcoal"}`}>
                      {format(day, "d")}
                    </div>
                    <div className="flex flex-col gap-0.5 w-full">
                      {daySchedules.length === 0 ? (
                        <div className="h-1 rounded-full bg-mist" />
                      ) : (
                        <>
                          {daySchedules.slice(0, 3).map(s => {
                            const role = getRoleForId(s.role_id);
                            const colors = role ? ROLE_CATEGORY_COLORS[role.category] : { bg: "#E8E6E0", text: "#888680", border: "#C8C5BC" };
                            return (
                              <div key={s.id} className="w-full h-4 rounded px-1 flex items-center gap-0.5 overflow-hidden" style={{ backgroundColor: colors.bg }}>
                                {role && <span className="text-[8px] leading-none shrink-0">{ROLE_EMOJI[role.category]}</span>}
                                <span className="text-[8px] truncate leading-none" style={{ color: colors.text }}>{s.title}</span>
                              </div>
                            );
                          })}
                          {daySchedules.length > 3 && (
                            <span className="text-[8px] text-muted-foreground text-center leading-none">+{daySchedules.length - 3}</span>
                          )}
                        </>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 今週 育てるRole回数 */}
          {Object.keys(roleWeekCount).length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-mist">
              {Object.entries(roleWeekCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([roleId, count]) => {
                  const role = getRoleForId(roleId);
                  if (!role) return null;
                  const colors = ROLE_CATEGORY_COLORS[role.category];
                  return (
                    <div key={roleId} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px]"
                      style={{ backgroundColor: colors.bg, color: colors.text }}>
                      <span>{ROLE_EMOJI[role.category]}</span>
                      <span>{role.title}</span>
                      <span className="font-semibold">{count}回</span>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-mist">
              {roles.map(role => {
                const colors = ROLE_CATEGORY_COLORS[role.category];
                return (
                  <div key={role.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px]"
                    style={{ backgroundColor: colors.bg, color: colors.text }}>
                    <span>{ROLE_EMOJI[role.category]}</span>
                    <span>{role.title}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* ⑥ 1mm日記 */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-medium text-charcoal">1mm日記</h2>
          <Link href={`/daily-log/${todayStr}`} className="text-[11px] text-sage">
            詳しく記録 →
          </Link>
        </div>
        <Link href={`/daily-log/${todayStr}`}>
          <div className="bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform">
            {todayLog ? (
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">
                    {todayLog.mood_after ? MOOD_EMOJI[todayLog.mood_after] : "📝"}
                  </span>
                  <div className="flex-1 min-w-0">
                    {todayLog.one_line_diary ? (
                      <p className="text-sm text-charcoal">&ldquo;{todayLog.one_line_diary}&rdquo;</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">続けて記録する →</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {todayLog.english_minutes > 0 && <span className="text-[9px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded-full">🌍 {todayLog.english_minutes}分</span>}
                      {todayLog.exercise_minutes > 0 && <span className="text-[9px] bg-green-50 text-green-500 px-1.5 py-0.5 rounded-full">🌿 {todayLog.exercise_minutes}分</span>}
                      {todayLog.creator_minutes > 0 && <span className="text-[9px] bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded-full">🎵 {todayLog.creator_minutes}分</span>}
                      {todayLog.weather && <span className="text-[9px] text-muted-foreground">{todayLog.weather}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-2xl">📝</span>
                <div>
                  <p className="text-sm font-medium text-charcoal">今日を1行で残す</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    小さな記録が、明日のプランを良くします
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
              </div>
            )}
          </div>
        </Link>
      </motion.div>

      {/* ⑥.5 今週の積み上げ */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27 }}>
        <Link href="/report">
          <div className="bg-white rounded-3xl px-5 py-4 shadow-sm active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-medium text-charcoal">今週の積み上げ</p>
              <span className="text-[11px] text-sage">詳しく見る →</span>
            </div>
            <div className="flex items-end justify-between gap-1.5" style={{ height: 56 }}>
              {weekDayTotals.map(({ day, total }) => (
                <div key={day.toISOString()} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-md"
                    style={{
                      height: Math.max((total / weekChartMax) * 40, total > 0 ? 4 : 2),
                      backgroundColor: isToday(day) ? "#8FA888" : "#C8DBC6",
                    }}
                  />
                  <span className={`text-[9px] ${isToday(day) ? "text-sage font-medium" : "text-muted-foreground"}`}>
                    {format(day, "E", { locale: ja })}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              今週合計 {weekTotalMinutes >= 60 ? `${Math.floor(weekTotalMinutes / 60)}時間${weekTotalMinutes % 60 || ""}` : `${weekTotalMinutes}分`}
            </p>
          </div>
        </Link>
      </motion.div>

      {/* Inbox */}
      {inboxCount > 0 && (
        <Link href="/inbox">
          <div className="flex items-center gap-3 px-4 py-3 bg-white border border-stone-200 rounded-2xl active:scale-[0.98] transition-transform">
            <div className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
              <Inbox className="w-4 h-4 text-stone-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-700">Inbox</p>
              <p className="text-[11px] text-stone-400">{inboxCount}件の未整理アイテム</p>
            </div>
            <span className="text-[11px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-medium">{inboxCount}</span>
            <ArrowRight className="w-4 h-4 text-stone-300" />
          </div>
        </Link>
      )}

      {/* ⑦ 週次レビュー / 夜の振り返り */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Link href="/weekly-review">
          <div className="rounded-3xl px-5 py-4 flex items-center gap-4 active:scale-[0.98] transition-transform shadow-sm"
            style={{ background: isEvening ? "linear-gradient(135deg, #2D2B35 0%, #1A1A24 100%)" : "white" }}>
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
              style={{ backgroundColor: isEvening ? "rgba(255,255,255,0.1)" : "#E8DDD0" }}>
              {isEvening
                ? <Moon className="w-5 h-5 text-white/80" />
                : <Sun className="w-5 h-5 text-amber-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${isEvening ? "text-white" : "text-charcoal"}`}>
                {isEvening ? "今日の振り返りをしよう" : "週次レビュー"}
              </p>
              <p className={`text-[11px] mt-0.5 ${isEvening ? "text-white/55" : "text-muted-foreground"}`}>
                {isEvening ? "夢との距離を確かめる時間" : "今週の成長を振り返る"}
              </p>
            </div>
            <ArrowRight className={`w-4 h-4 shrink-0 ${isEvening ? "text-white/50" : "text-muted-foreground"}`} />
          </div>
        </Link>
      </motion.div>

    </div>


    </>
  );
}
