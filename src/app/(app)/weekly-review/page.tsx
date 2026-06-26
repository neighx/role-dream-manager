"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { ja } from "date-fns/locale";
import { Sparkles, RefreshCw, Trophy, AlertCircle, Target, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PetAssistantCard } from "@/components/pet/PetAssistantCard";
import { Role, Task, DailyCheckin, UserProfile, PetType, ROLE_CATEGORY_COLORS } from "@/types";

interface AIReview {
  reflection: string;
  wins: string[];
  challenges: string[];
  next_week_focus: string;
  encouragement: string;
}

export default function WeeklyReviewPage() {
  const supabase = createClient();
  const [roles, setRoles] = useState<Role[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [aiReview, setAiReview] = useState<AIReview | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // 月曜始まり
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const weekEndStr = format(weekEnd, "yyyy-MM-dd");

      // weekly_summaries から今週のキャッシュを確認
      const { data: cached } = await supabase
        .from("weekly_summaries")
        .select("*")
        .eq("user_id", user.id)
        .eq("week_start", weekStartStr)
        .maybeSingle();

      // ロールと必要最小限のデータのみ取得
      const [{ data: r }, { data: t }, { data: c }, { data: p }] = await Promise.all([
        supabase.from("roles").select("id,title,category").eq("user_id", user.id),
        supabase.from("tasks").select("id,title,status,role_id").eq("user_id", user.id)
          .gte("created_at", weekStartStr)
          .lte("created_at", weekEndStr + "T23:59:59"),
        supabase.from("daily_checkins").select("id,date,energy,mood,mode").eq("user_id", user.id)
          .gte("date", weekStartStr).lte("date", weekEndStr),
        supabase.from("users_profile").select("name,selected_pet").eq("user_id", user.id).single(),
      ]);

      setRoles((r || []) as unknown as Role[]);
      setTasks((t || []) as unknown as Task[]);
      setCheckins((c || []) as unknown as DailyCheckin[]);
      setProfile(p as any);

      // キャッシュにAIレビューがあれば復元
      if (cached?.ai_review) {
        setAiReview(cached.ai_review as AIReview);
      }

      // 集計結果をweekly_summariesに保存（upsert）
      const doneTasks = (t || []).filter((tk: any) => tk.status === "done");
      await supabase.from("weekly_summaries").upsert({
        user_id: user.id,
        week_start: weekStartStr,
        week_end: weekEndStr,
        tasks_done: doneTasks.length,
        tasks_total: (t || []).length,
        checkin_count: (c || []).length,
        avg_energy: (c || []).length > 0
          ? (c || []).reduce((s: number, ci: any) => s + ci.energy, 0) / (c || []).length
          : null,
      }, { onConflict: "user_id,week_start", ignoreDuplicates: false });
    }
    load();
  }, []);

  const doneTasks = tasks.filter((t) => t.status === "done");
  const pendingTasks = tasks.filter((t) => t.status === "todo" || t.status === "in_progress");

  // Roleごとの活動数
  const roleActivity = roles.map((role) => ({
    role,
    count: tasks.filter((t) => t.role_id === role.id).length,
    done: doneTasks.filter((t) => t.role_id === role.id).length,
  })).sort((a, b) => b.count - a.count);

  const activeRoles = roleActivity.filter((r) => r.count > 0);
  const inactiveRoles = roleActivity.filter((r) => r.count === 0);

  // 感情傾向
  const avgEnergy = checkins.length > 0
    ? Math.round(checkins.reduce((s, c) => s + c.energy, 0) / checkins.length)
    : null;

  const petType = (profile?.selected_pet || "cat") as PetType;

  async function generateAIReview() {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/weekly-review", { method: "POST" });
      const data = await res.json();
      if (data.review) {
        setAiReview(data.review as AIReview);
        // AIレビュー結果をweekly_summariesにキャッシュ保存
        const weekStartStr = format(weekStart, "yyyy-MM-dd");
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("weekly_summaries").upsert({
            user_id: user.id,
            week_start: weekStartStr,
            week_end: format(weekEnd, "yyyy-MM-dd"),
            ai_review: data.review,
          }, { onConflict: "user_id,week_start", ignoreDuplicates: false });
        }
      }
    } finally {
      setIsGenerating(false);
    }
  }

  function buildWeekMessage(): string {
    const activeCount = activeRoles.length;
    const totalDone = doneTasks.length;
    const inactiveCount = inactiveRoles.length;

    if (totalDone === 0 && activeCount === 0) {
      return "今週は少し休む週だったね。夢との線は切れていないよ。来週、また小さく始めよう。";
    }

    let msg = `今週は${totalDone}件のTODOを完了したよ。`;
    if (activeRoles[0]) {
      msg += `${activeRoles[0].role.title}Roleがよく動いていたね。`;
    }
    if (inactiveCount > 0) {
      const inactiveNames = inactiveRoles.slice(0, 2).map((r) => r.role.title).join("・");
      msg += `${inactiveNames}は少し空いているよ。来週は少しだけ意識してみよう。`;
    }
    return msg;
  }

  return (
    <div className="px-5 pt-safe pt-6 space-y-5 pb-8">
      {/* ヘッダー */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs text-muted-foreground">
          {format(weekStart, "M月d日", { locale: ja })} — {format(weekEnd, "M月d日（E）", { locale: ja })}
        </p>
        <h1 className="text-2xl font-medium text-charcoal">週次レビュー</h1>
      </motion.div>

      {/* ペットメッセージ */}
      <PetAssistantCard petType={petType} message={buildWeekMessage()} />

      {/* 数字サマリー */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { label: "完了TODO", value: doneTasks.length, unit: "件", color: "#C8DBC6" },
          { label: "未完了", value: pendingTasks.length, unit: "件", color: "#EDD5CC" },
          { label: "平均エネルギー", value: avgEnergy ?? "—", unit: "%", color: "#BDD5EA" },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-3xl p-4 text-center shadow-sm">
            <p className="text-2xl font-medium text-charcoal">
              {item.value}
              <span className="text-sm ml-0.5">{item.unit}</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">{item.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Roleアクティビティ */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-3xl p-5 space-y-3"
      >
        <h3 className="text-sm font-medium text-charcoal">今週のRoleアクティビティ</h3>
        {roleActivity.map(({ role, count, done }, i) => {
          const colors = ROLE_CATEGORY_COLORS[role.category];
          const percent = count > 0 ? Math.round((done / count) * 100) : 0;

          return (
            <div key={role.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.bg }} />
                  <span className="text-sm text-charcoal">{role.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {count === 0 ? "未着手" : `${done}/${count}件完了`}
                </span>
              </div>
              {count > 0 && (
                <div className="h-1.5 bg-mist rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: colors.border }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </motion.div>

      {/* 今週の感情 */}
      {checkins.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl p-5"
        >
          <h3 className="text-sm font-medium text-charcoal mb-3">今週の感情チェックイン</h3>
          <div className="space-y-2">
            {checkins.map((c) => (
              <div key={c.id} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-14">
                  {format(new Date(c.date), "M/d（E）", { locale: ja })}
                </span>
                <div className="flex-1 h-2 bg-mist rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-sage"
                    style={{ width: `${c.energy}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8">{c.energy}%</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 未完了TODO */}
      {pendingTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-3xl p-5"
        >
          <h3 className="text-sm font-medium text-charcoal mb-3">今週まだ途中のTODO</h3>
          <p className="text-xs text-muted-foreground mb-3">
            今日はまだ途中です。来週また小さく始めましょう。
          </p>
          <div className="space-y-2">
            {pendingTasks.slice(0, 5).map((task) => (
              <div key={task.id} className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full border-2 border-mist mt-0.5 shrink-0" />
                <p className="text-sm text-charcoal">{task.title}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 来週の提案 */}
      {inactiveRoles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-sage/10 rounded-3xl p-5"
        >
          <h3 className="text-sm font-medium text-charcoal mb-3">来週の提案</h3>
          <div className="space-y-2">
            {inactiveRoles.slice(0, 3).map(({ role }) => {
              const colors = ROLE_CATEGORY_COLORS[role.category];
              return (
                <div key={role.id} className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center text-sm shrink-0"
                    style={{ backgroundColor: colors.bg }}
                  >
                    {role.category === "creator" ? "🎵" : role.category === "health" ? "🌿" : role.category === "work" ? "💼" : role.category === "relationship" ? "💛" : role.category === "learning" ? "🌍" : "🕯"}
                  </div>
                  <p className="text-sm text-charcoal">
                    {role.title}に10分だけ時間を取ってみよう
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* AI振り返り */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-white rounded-3xl p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-charcoal">AIコーチからの振り返り</h3>
          <button
            onClick={generateAIReview}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-sage/10 text-sage disabled:opacity-50 transition-all"
          >
            {isGenerating ? (
              <><RefreshCw className="w-3 h-3 animate-spin" />生成中...</>
            ) : (
              <><Sparkles className="w-3 h-3" />{aiReview ? "再生成" : "振り返る"}</>
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {!aiReview && !isGenerating && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-6"
            >
              <div className="w-12 h-12 rounded-full bg-sage/10 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-5 h-5 text-sage" />
              </div>
              <p className="text-sm text-muted-foreground">
                AIが今週のデータを読んで<br />パーソナルな振り返りを届けます
              </p>
            </motion.div>
          )}

          {isGenerating && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {[80, 65, 90, 70].map((w, i) => (
                <div key={i} className="h-3 bg-mist rounded-full animate-pulse" style={{ width: `${w}%` }} />
              ))}
            </motion.div>
          )}

          {aiReview && !isGenerating && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* 振り返り全体 */}
              <p className="text-sm text-charcoal leading-relaxed">{aiReview.reflection}</p>

              {/* よかったこと */}
              {aiReview.wins.length > 0 && (
                <div className="bg-sage/8 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Trophy className="w-4 h-4 text-sage" />
                    <p className="text-xs font-medium text-sage">今週のWin</p>
                  </div>
                  {aiReview.wins.map((win, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-sage mt-0.5 shrink-0">✓</span>
                      <p className="text-sm text-charcoal leading-relaxed">{win}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* 課題 */}
              {aiReview.challenges.length > 0 && (
                <div className="bg-blush/30 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <p className="text-xs font-medium text-rose-400">改善ポイント</p>
                  </div>
                  {aiReview.challenges.map((ch, i) => (
                    <p key={i} className="text-sm text-charcoal leading-relaxed">{ch}</p>
                  ))}
                </div>
              )}

              {/* 来週のフォーカス */}
              <div className="bg-lavender/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  <p className="text-xs font-medium text-purple-400">来週のフォーカス</p>
                </div>
                <p className="text-sm text-charcoal leading-relaxed">{aiReview.next_week_focus}</p>
              </div>

              {/* 励ましの一言 */}
              <div className="flex items-center gap-3 bg-charcoal/5 rounded-2xl px-4 py-3.5">
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-sm font-medium text-charcoal italic">{aiReview.encouragement}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
