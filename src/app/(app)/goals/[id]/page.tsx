"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, Check, Calendar, Target, Loader2 } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Goal, GoalTask, GoalCategory, GOAL_CATEGORY_CONFIG, GOAL_TIME_HORIZON_CONFIG, GoalTimeHorizon, Role } from "@/types";

export default function GoalDetailPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const goalId = params.id as string;

  const [goal, setGoal] = useState<Goal | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [tasks, setTasks] = useState<GoalTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    load();
  }, [goalId]);

  async function load() {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: g }, { data: ts }] = await Promise.all([
      supabase.from("goals").select("*").eq("id", goalId).eq("user_id", user.id).single(),
      supabase.from("goal_tasks").select("*").eq("goal_id", goalId).order("sort_order"),
    ]);

    if (!g) { router.push("/goals"); return; }
    setGoal(g as Goal);
    setTasks((ts || []) as GoalTask[]);
    setIsLoading(false);
  }

  async function toggleTask(task: GoalTask) {
    const next = !task.is_completed;
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, is_completed: next } : t));
    await supabase.from("goal_tasks").update({ is_completed: next }).eq("id", task.id);
  }

  if (isLoading || !goal) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  const config = GOAL_CATEGORY_CONFIG[goal.category as GoalCategory] ?? GOAL_CATEGORY_CONFIG.other;
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
              <span className="text-lg">{config.emoji}</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: config.bg + "30", color: config.bg }}
              >
                {config.label}
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
          <div className="text-right shrink-0">
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
        <p className="text-sm font-medium text-charcoal flex items-center gap-1.5">
          <Target className="w-4 h-4 text-sage" />
          やることリスト（逆算）
        </p>

        {tasks.length === 0 && (
          <div className="bg-white rounded-2xl p-5 text-center text-sm text-muted-foreground">
            タスクがありません
          </div>
        )}

        <div className="relative">
          {/* タイムライン縦線 */}
          <div className="absolute left-[17px] top-4 bottom-4 w-0.5 bg-mist" />

          <div className="space-y-2">
            {tasks.map((task, i) => {
              const st = taskStatus(task);
              const sc = statusConfig[st];

              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-3"
                >
                  {/* タイムラインドット + チェックボックス */}
                  <button
                    onClick={() => toggleTask(task)}
                    className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all"
                    style={{ backgroundColor: task.is_completed ? "#8FA888" : "#FFFFFF", border: `2px solid ${sc.dot}` }}
                  >
                    {task.is_completed && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>

                  {/* タスク内容 */}
                  <div className="flex-1 bg-white rounded-2xl px-4 py-3 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${sc.text} flex-1`}>{task.title}</p>
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
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
