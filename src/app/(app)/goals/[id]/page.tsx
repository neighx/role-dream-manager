"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import { ja } from "date-fns/locale";
import {
  ChevronLeft, Check, Calendar, Target, Loader2,
  Pencil, Trash2, Plus, X, Save,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Goal, GoalTask,
  GOAL_TIME_HORIZON_CONFIG, GoalTimeHorizon, Role, ROLE_CATEGORY_COLORS,
} from "@/types";

export default function GoalDetailPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const goalId = params.id as string;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tasks, setTasks] = useState<GoalTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ─ Goal edit state
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editHorizon, setEditHorizon] = useState<GoalTimeHorizon>("event");
  const [editRoleId, setEditRoleId] = useState<string>("");
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  // ─ Goal delete confirm
  const [showDeleteGoal, setShowDeleteGoal] = useState(false);
  const [isDeletingGoal, setIsDeletingGoal] = useState(false);

  // ─ Task edit state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDate, setEditTaskDate] = useState("");
  const [isSavingTask, setIsSavingTask] = useState(false);

  // ─ Add task
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDate, setNewTaskDate] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);

  useEffect(() => { load(); }, [goalId]);

  async function load() {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: g }, { data: ts }, { data: rs }] = await Promise.all([
      supabase.from("goals").select("*").eq("id", goalId).eq("user_id", user.id).single(),
      supabase.from("goal_tasks").select("*").eq("goal_id", goalId).order("sort_order"),
      supabase.from("roles").select("id,title,category").eq("user_id", user.id).order("display_order"),
    ]);

    if (!g) { router.push("/goals"); return; }
    setGoal(g as Goal);
    setTasks((ts || []) as GoalTask[]);
    setRoles((rs || []) as Role[]);

    if ((g as Goal).role_id) {
      const { data: r } = await supabase.from("roles").select("*").eq("id", (g as Goal).role_id!).single();
      if (r) setRole(r as Role);
    }
    setIsLoading(false);
  }

  // ─── Toggle task ──────────────────────────────────────────────
  async function toggleTask(task: GoalTask) {
    const next = !task.is_completed;
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, is_completed: next } : t));
    await supabase.from("goal_tasks").update({ is_completed: next }).eq("id", task.id);
  }

  // ─── Goal edit ────────────────────────────────────────────────
  function openGoalEdit() {
    if (!goal) return;
    setEditTitle(goal.title);
    setEditDate(goal.event_date);
    setEditHorizon(goal.time_horizon as GoalTimeHorizon);
    setEditRoleId(goal.role_id || "");
    setShowGoalEdit(true);
  }

  async function saveGoal() {
    if (!goal || !editTitle.trim() || !editDate) return;
    setIsSavingGoal(true);
    await supabase.from("goals").update({
      title: editTitle.trim(),
      event_date: editDate,
      time_horizon: editHorizon,
      role_id: editRoleId || null,
    }).eq("id", goalId);
    setGoal((prev) => prev ? { ...prev, title: editTitle.trim(), event_date: editDate, time_horizon: editHorizon, role_id: editRoleId || null } : prev);
    setIsSavingGoal(false);
    setShowGoalEdit(false);
  }

  // ─── Goal delete ──────────────────────────────────────────────
  async function deleteGoal() {
    setIsDeletingGoal(true);
    await supabase.from("goal_tasks").delete().eq("goal_id", goalId);
    await supabase.from("goals").delete().eq("id", goalId);
    router.push("/goals");
  }

  // ─── Task edit ────────────────────────────────────────────────
  function startEditTask(task: GoalTask) {
    setEditingTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskDate(task.due_date || "");
  }

  async function saveTask(taskId: string) {
    if (!editTaskTitle.trim()) return;
    setIsSavingTask(true);
    await supabase.from("goal_tasks").update({
      title: editTaskTitle.trim(),
      due_date: editTaskDate || null,
    }).eq("id", taskId);
    setTasks((prev) => prev.map((t) =>
      t.id === taskId ? { ...t, title: editTaskTitle.trim(), due_date: editTaskDate || null } : t
    ));
    setIsSavingTask(false);
    setEditingTaskId(null);
  }

  async function deleteTask(taskId: string) {
    await supabase.from("goal_tasks").delete().eq("id", taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    if (editingTaskId === taskId) setEditingTaskId(null);
  }

  // ─── Add task ────────────────────────────────────────────────
  async function addTask() {
    if (!newTaskTitle.trim()) return;
    setIsAddingTask(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: inserted } = await supabase.from("goal_tasks").insert({
      goal_id: goalId,
      user_id: user.id,
      title: newTaskTitle.trim(),
      due_date: newTaskDate || null,
      sort_order: tasks.length,
    }).select().single();
    if (inserted) setTasks((prev) => [...prev, inserted as GoalTask]);
    setNewTaskTitle("");
    setNewTaskDate("");
    setShowAddTask(false);
    setIsAddingTask(false);
  }

  // ─── Helpers ─────────────────────────────────────────────────
  if (isLoading || !goal) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  const horizonConfig = GOAL_TIME_HORIZON_CONFIG[goal.time_horizon as GoalTimeHorizon] ?? GOAL_TIME_HORIZON_CONFIG.event;
  const completedCount = tasks.filter((t) => t.is_completed).length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const daysLeft = differenceInDays(new Date(goal.event_date + "T00:00:00"), new Date());

  function taskStatus(task: GoalTask): "done" | "overdue" | "today" | "upcoming" {
    if (task.is_completed) return "done";
    if (!task.due_date) return "upcoming";
    const d = differenceInDays(new Date(task.due_date + "T00:00:00"), new Date());
    if (d < 0) return "overdue";
    if (d === 0) return "today";
    return "upcoming";
  }

  const statusConfig = {
    done:     { dot: "#8FA888", text: "line-through text-muted-foreground", label: "" },
    overdue:  { dot: "#E87070", text: "text-charcoal",                      label: "期限超過" },
    today:    { dot: "#E8A84A", text: "text-charcoal font-medium",           label: "今日" },
    upcoming: { dot: "#BDD5EA", text: "text-charcoal",                       label: "" },
  };

  return (
    <>
    <div className="px-5 pt-safe pt-5 pb-10 space-y-5">

      {/* 戻るボタン */}
      <motion.button
        initial={{ opacity: 0, x: -6 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => router.push("/goals")}
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <ChevronLeft className="w-4 h-4" />
        ゴール一覧
      </motion.button>

      {/* ゴールヘッダー */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-charcoal rounded-3xl p-5 text-ivory space-y-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{horizonConfig.emoji}</span>
              {role && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-ivory/80">
                  {role.title}
                </span>
              )}
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: horizonConfig.bg + "30", color: horizonConfig.bg }}
              >
                {horizonConfig.emoji} {horizonConfig.label}
              </span>
            </div>
            <h1 className="text-xl font-medium leading-snug">{goal.title}</h1>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Calendar className="w-3 h-3 text-ivory/60" />
              <p className="text-xs text-ivory/70">
                {format(new Date(goal.event_date + "T00:00:00"), "yyyy年M月d日（E）", { locale: ja })}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="text-right">
              {daysLeft >= 0 ? (
                <>
                  <p className={`text-3xl font-medium ${daysLeft <= 7 ? "text-amber-300" : "text-ivory"}`}>
                    {daysLeft}
                  </p>
                  <p className="text-[10px] text-ivory/60">日後</p>
                </>
              ) : (
                <p className="text-sm text-ivory/50">終了</p>
              )}
            </div>
            {/* 編集・削除ボタン */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={openGoalEdit}
                className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center active:bg-white/25"
              >
                <Pencil className="w-3.5 h-3.5 text-ivory/80" />
              </button>
              <button
                onClick={() => setShowDeleteGoal(true)}
                className="w-7 h-7 rounded-full bg-red-500/20 flex items-center justify-center active:bg-red-500/35"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-300" />
              </button>
            </div>
          </div>
        </div>

        {/* 進捗バー */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ivory/70">{completedCount} / {tasks.length} 完了</span>
            <span className="text-xs text-ivory/90 font-medium">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-ivory/15 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-sage"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
      </motion.div>

      {/* タスクリスト */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.07 }}
        className="space-y-2.5"
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-charcoal flex items-center gap-1.5">
            <Target className="w-4 h-4 text-sage" />
            やることリスト（逆算）
          </p>
          <button
            onClick={() => { setShowAddTask(true); setEditingTaskId(null); }}
            className="flex items-center gap-1 text-xs text-sage"
          >
            <Plus className="w-3.5 h-3.5" />追加
          </button>
        </div>

        {/* タスク追加フォーム */}
        <AnimatePresence>
          {showAddTask && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-white rounded-2xl p-4 space-y-3">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                  placeholder="タスクを入力…"
                  autoFocus
                  className="w-full text-sm text-charcoal px-3 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage/30"
                />
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="date"
                    value={newTaskDate}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                    className="flex-1 text-sm text-charcoal bg-mist rounded-xl px-3 py-2 focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addTask}
                    disabled={!newTaskTitle.trim() || isAddingTask}
                    className="flex-1 py-2.5 rounded-xl bg-sage text-white text-sm font-medium disabled:opacity-40"
                  >
                    {isAddingTask ? "追加中…" : "追加"}
                  </button>
                  <button
                    onClick={() => { setShowAddTask(false); setNewTaskTitle(""); setNewTaskDate(""); }}
                    className="w-10 py-2 rounded-xl border border-border flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {tasks.length === 0 && !showAddTask && (
          <div className="bg-white rounded-2xl p-5 text-center text-sm text-muted-foreground">
            タスクがありません
          </div>
        )}

        <div className="relative">
          <div className="absolute left-[17px] top-4 bottom-4 w-0.5 bg-mist" />
          <div className="space-y-2">
            {tasks.map((task, i) => {
              const st = taskStatus(task);
              const sc = statusConfig[st];
              const isEditing = editingTaskId === task.id;

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-3"
                >
                  {/* チェックボタン */}
                  <button
                    onClick={() => toggleTask(task)}
                    className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all mt-0.5"
                    style={{ backgroundColor: task.is_completed ? "#8FA888" : "#FFFFFF", border: `2px solid ${sc.dot}` }}
                  >
                    {task.is_completed && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>

                  {/* タスク内容 */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      /* 編集モード */
                      <div className="bg-white rounded-2xl px-4 py-3 space-y-2.5">
                        <input
                          type="text"
                          value={editTaskTitle}
                          onChange={(e) => setEditTaskTitle(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveTask(task.id)}
                          autoFocus
                          className="w-full text-sm text-charcoal px-2 py-1.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-sage/30"
                        />
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <input
                            type="date"
                            value={editTaskDate}
                            onChange={(e) => setEditTaskDate(e.target.value)}
                            className="flex-1 text-sm text-charcoal bg-mist rounded-lg px-2 py-1.5 focus:outline-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveTask(task.id)}
                            disabled={!editTaskTitle.trim() || isSavingTask}
                            className="flex-1 py-2 rounded-xl bg-sage text-white text-xs font-medium disabled:opacity-40 flex items-center justify-center gap-1"
                          >
                            <Save className="w-3 h-3" />保存
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="w-10 py-2 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                          <button
                            onClick={() => setEditingTaskId(null)}
                            className="w-10 py-2 rounded-xl border border-border flex items-center justify-center"
                          >
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* 通常モード */
                      <div className="bg-white rounded-2xl px-4 py-3 flex items-start justify-between gap-2">
                        <p className={`text-sm ${sc.text} flex-1 leading-snug`}>{task.title}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {sc.label && (
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{
                                backgroundColor: st === "overdue" ? "#FCDEDE" : st === "today" ? "#FEF3CD" : "#EEE",
                                color: st === "overdue" ? "#C0392B" : st === "today" ? "#A0640A" : "#888",
                              }}
                            >
                              {sc.label}
                            </span>
                          )}
                          {task.due_date && (
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(task.due_date + "T00:00:00"), "M/d", { locale: ja })}
                            </span>
                          )}
                          <button
                            onClick={() => isEditing ? setEditingTaskId(null) : startEditTask(task)}
                            className="w-6 h-6 rounded-lg bg-mist/80 flex items-center justify-center active:bg-mist ml-0.5"
                          >
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>

    {/* ─── ゴール編集モーダル ─────────────────────────────────── */}
    <AnimatePresence>
      {showGoalEdit && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center"
          onClick={() => !isSavingGoal && setShowGoalEdit(false)}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="bg-ivory w-full max-w-md rounded-t-3xl flex flex-col"
            style={{ maxHeight: "85dvh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
              <p className="text-base font-medium text-charcoal">ゴールを編集</p>
              <button onClick={() => !isSavingGoal && setShowGoalEdit(false)} className="p-1">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-10 space-y-4">
              {/* タイトル */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">ゴール名</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full text-sm text-charcoal bg-white rounded-xl px-3 py-3 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* 時間軸 */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">時間軸</p>
                <div className="flex gap-2 flex-wrap">
                  {(Object.entries(GOAL_TIME_HORIZON_CONFIG) as [GoalTimeHorizon, typeof GOAL_TIME_HORIZON_CONFIG[GoalTimeHorizon]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setEditHorizon(key)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs border transition-all ${
                        editHorizon === key
                          ? "bg-sage/10 border-sage text-sage font-medium"
                          : "border-border text-muted-foreground bg-white"
                      }`}
                    >
                      {cfg.emoji} {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 紐づくRole */}
              {roles.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">紐づくRole（任意）</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setEditRoleId("")}
                      className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${
                        editRoleId === "" ? "bg-sage/10 border-sage text-sage font-medium" : "border-border text-muted-foreground bg-white"
                      }`}
                    >
                      紐づけない
                    </button>
                    {roles.map((r) => {
                      const colors = ROLE_CATEGORY_COLORS[r.category];
                      return (
                        <button
                          key={r.id}
                          onClick={() => setEditRoleId(r.id)}
                          className="px-3 py-1.5 rounded-xl text-xs border transition-all"
                          style={editRoleId === r.id
                            ? { backgroundColor: colors.bg, borderColor: colors.border, color: colors.text, fontWeight: 500 }
                            : { borderColor: "#e0ddd6", color: "#888", backgroundColor: "white" }}
                        >
                          {r.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* イベント日 */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">イベント日</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full text-sm text-charcoal bg-white rounded-xl px-3 py-3 focus:outline-none"
                />
              </div>

              <motion.button
                onClick={saveGoal}
                disabled={!editTitle.trim() || !editDate || isSavingGoal}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl bg-sage text-white font-medium text-sm disabled:opacity-40"
              >
                {isSavingGoal ? "保存中…" : "変更を保存"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    {/* ─── ゴール削除確認モーダル ─────────────────────────────── */}
    <AnimatePresence>
      {showDeleteGoal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-5"
          onClick={() => !isDeletingGoal && setShowDeleteGoal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <p className="text-2xl mb-2">🗑</p>
              <p className="text-base font-medium text-charcoal">ゴールを削除しますか？</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                「{goal.title}」と、関連する{tasks.length}件のタスクが削除されます。この操作は取り消せません。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteGoal(false)}
                className="flex-1 py-3 rounded-2xl border border-border text-sm text-muted-foreground"
              >
                キャンセル
              </button>
              <button
                onClick={deleteGoal}
                disabled={isDeletingGoal}
                className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-medium disabled:opacity-50"
              >
                {isDeletingGoal ? "削除中…" : "削除する"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
