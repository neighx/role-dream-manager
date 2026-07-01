"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, differenceInDays } from "date-fns";
import { ja } from "date-fns/locale";
import { Plus, X, ChevronRight, Target, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Goal, GoalTask, GoalTimeHorizon, GOAL_TIME_HORIZON_CONFIG, Role, ROLE_CATEGORY_COLORS } from "@/types";

export default function GoalsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [goals, setGoals] = useState<(Goal & { tasks: GoalTask[] })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // 新規ゴールフォーム
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTimeHorizon, setNewTimeHorizon] = useState<GoalTimeHorizon>("event");
  const [newRoleId, setNewRoleId] = useState<string>("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: rs } = await supabase.from("roles").select("id,title,category").eq("user_id", user.id).order("display_order");
    setRoles((rs || []) as Role[]);

    const { data: gs } = await supabase
      .from("goals")
      .select("*, goal_tasks(*)")
      .eq("user_id", user.id)
      .order("event_date", { ascending: true });

    setGoals(
      (gs || []).map((g: any) => ({
        ...g,
        tasks: (g.goal_tasks || []).sort((a: GoalTask, b: GoalTask) =>
          (a.due_date || "").localeCompare(b.due_date || "")
        ),
      }))
    );
    setIsLoading(false);
  }

  async function createGoal() {
    if (!newTitle.trim() || !newDate) return;
    setIsGenerating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // ゴール登録
    const { data: goal } = await supabase
      .from("goals")
      .insert({ user_id: user.id, title: newTitle.trim(), category: "other", event_date: newDate, role_id: newRoleId || null, time_horizon: newTimeHorizon })
      .select()
      .single();

    if (!goal) { setIsGenerating(false); return; }

    // AIでタスク生成
    const res = await fetch("/api/ai/generate-goal-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), category: "other", event_date: newDate }),
    });
    const { tasks } = await res.json();

    // タスク一括登録
    if (tasks?.length) {
      await supabase.from("goal_tasks").insert(
        tasks.map((t: { title: string; due_date: string }, i: number) => ({
          goal_id: goal.id,
          user_id: user.id,
          title: t.title,
          due_date: t.due_date || null,
          sort_order: i,
        }))
      );
    }

    setNewTitle("");
    setNewDate("");
    setNewRoleId("");
    setNewTimeHorizon("event");
    setShowModal(false);
    setIsGenerating(false);

    // 作成後すぐ詳細へ
    router.push(`/goals/${goal.id}`);
  }

  function progressFor(g: Goal & { tasks: GoalTask[] }): number {
    if (!g.tasks.length) return 0;
    return Math.round((g.tasks.filter((t) => t.is_completed).length / g.tasks.length) * 100);
  }

  function countdownLabel(eventDate: string): { text: string; urgent: boolean } {
    const d = differenceInDays(new Date(eventDate + "T00:00:00"), new Date());
    if (d < 0) return { text: "終了", urgent: false };
    if (d === 0) return { text: "今日！", urgent: true };
    if (d <= 7) return { text: `あと${d}日`, urgent: true };
    if (d <= 30) return { text: `あと${d}日`, urgent: false };
    const weeks = Math.floor(d / 7);
    return { text: `あと${weeks}週`, urgent: false };
  }

  const today = new Date();
  const minDate = format(today, "yyyy-MM-dd");

  return (
    <div className="px-5 pt-safe pt-5 pb-10 space-y-5">

      {/* ヘッダー */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-sage" />
          <h1 className="text-2xl font-medium text-charcoal">ゴール</h1>
        </div>
        <p className="text-xs text-muted-foreground mt-1">特定の日に起きるイベント（ライブ、リリース、発表）</p>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 text-sm text-sage font-medium px-4 py-2 rounded-2xl bg-sage/10"
        >
          <Plus className="w-4 h-4" />
          追加
        </button>
      </motion.div>

      {/* ゴール一覧 */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      ) : goals.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-8 text-center shadow-sm"
        >
          <p className="text-3xl mb-3">🎯</p>
          <p className="text-sm font-medium text-charcoal mb-1">ゴールを追加しよう</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            イベント日を入れるだけで<br />
            AIが逆算してやることリストを作ってくれます
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-5 px-6 py-3 bg-sage text-white text-sm font-medium rounded-2xl"
          >
            最初のゴールを登録する
          </button>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {goals.map((g, i) => {
            const progress = progressFor(g);
            const config = GOAL_TIME_HORIZON_CONFIG[g.time_horizon as GoalTimeHorizon] ?? GOAL_TIME_HORIZON_CONFIG.event;
            const countdown = countdownLabel(g.event_date);
            const nextTask = g.tasks.find((t) => !t.is_completed);

            return (
              <motion.button
                key={g.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => router.push(`/goals/${g.id}`)}
                className="w-full bg-white rounded-3xl p-5 shadow-sm text-left active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{config.emoji}</span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: config.bg, color: config.text }}
                      >
                        {config.label}
                      </span>
                      <span
                        className={`text-[10px] font-medium ${countdown.urgent ? "text-red-500" : "text-muted-foreground"}`}
                      >
                        {countdown.text}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-charcoal truncate">{g.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {format(new Date(g.event_date + "T00:00:00"), "M月d日（E）", { locale: ja })}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-1" />
                </div>

                {/* 進捗バー */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {g.tasks.filter((t) => t.is_completed).length} / {g.tasks.length} 完了
                    </span>
                    <span className="text-[10px] text-sage font-medium">{progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-mist overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sage transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* 次のアクション */}
                {nextTask && (
                  <div className="mt-3 flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">次:</span>
                    <span className="text-[11px] text-charcoal font-medium truncate">{nextTask.title}</span>
                    {nextTask.due_date && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {format(new Date(nextTask.due_date + "T00:00:00"), "M/d", { locale: ja })}
                      </span>
                    )}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* ゴール追加モーダル */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-50 flex items-end justify-center"
            onClick={() => !isGenerating && setShowModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="bg-ivory w-full max-w-md rounded-t-3xl flex flex-col"
              style={{ maxHeight: "88dvh" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header — fixed, not scrolled */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
                <div>
                  <p className="text-base font-medium text-charcoal">ゴールを登録する</p>
                  <p className="text-[11px] text-muted-foreground">特定の日に起きるイベント（ライブ、リリース、発表）</p>
                </div>
                <button onClick={() => !isGenerating && setShowModal(false)} className="p-1">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-5 pb-10 space-y-4">

              {/* 時間軸選択 */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">時間軸</p>
                <div className="flex gap-2 flex-wrap">
                  {(Object.entries(GOAL_TIME_HORIZON_CONFIG) as [GoalTimeHorizon, typeof GOAL_TIME_HORIZON_CONFIG[GoalTimeHorizon]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setNewTimeHorizon(key)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs border transition-all ${
                        newTimeHorizon === key
                          ? "bg-sage/10 border-sage text-sage font-medium"
                          : "border-border text-muted-foreground bg-white"
                      }`}
                    >
                      {cfg.emoji} {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ロール選択（任意）*/}
              {roles.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">紐づくRole（任意）</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setNewRoleId("")}
                      className={`px-3 py-1.5 rounded-xl text-xs border transition-all ${
                        newRoleId === "" ? "bg-sage/10 border-sage text-sage font-medium" : "border-border text-muted-foreground bg-white"
                      }`}
                    >
                      紐づけない
                    </button>
                    {roles.map((r) => {
                      const colors = ROLE_CATEGORY_COLORS[r.category];
                      return (
                        <button
                          key={r.id}
                          onClick={() => setNewRoleId(r.id)}
                          className="px-3 py-1.5 rounded-xl text-xs border transition-all"
                          style={newRoleId === r.id
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

              {/* タイトル */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">ゴール名</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例：フェスでライブ"
                  className="w-full text-sm text-charcoal bg-white rounded-xl px-3 py-3 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* イベント日 */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">イベント日</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={minDate}
                  className="w-full text-sm text-charcoal bg-white rounded-xl px-3 py-3 focus:outline-none"
                />
              </div>

              {newTitle && newDate && (
                <p className="text-[11px] text-muted-foreground text-center">
                  AIがやることリストを逆算して自動で作ります
                </p>
              )}

              <motion.button
                onClick={createGoal}
                disabled={!newTitle.trim() || !newDate || isGenerating}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl bg-sage text-white font-medium text-sm disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AIがタスクを作成中...
                  </>
                ) : (
                  "登録してタスクを生成"
                )}
              </motion.button>
              </div>{/* end scrollable */}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
