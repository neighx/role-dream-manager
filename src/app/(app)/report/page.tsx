"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  format, startOfWeek, addDays, addWeeks, isToday, isSameDay,
  startOfMonth, endOfMonth, addMonths, eachWeekOfInterval,
} from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, X, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  DailyLog, Milestone, RoleCategory,
  ROLE_CATEGORY_COLORS, ROLE_CATEGORY_LABELS,
} from "@/types";

// ─── 定数 ──────────────────────────────────────────────────────

type ActivityKey = "exercise_minutes" | "study_minutes" | "english_minutes" | "creator_minutes" | "work_minutes";

const ACTIVITY_CONFIG: { key: ActivityKey; label: string; emoji: string; bg: string; text: string }[] = [
  { key: "exercise_minutes", label: "運動", emoji: "🏃", bg: "#C8DBC6", text: "#3A6B36" },
  { key: "study_minutes",    label: "勉強", emoji: "📚", bg: "#EDD5CC", text: "#9B5A4E" },
  { key: "english_minutes",  label: "英語", emoji: "🌍", bg: "#D8CDE8", text: "#6B4E9B" },
  { key: "creator_minutes",  label: "制作", emoji: "🎵", bg: "#BDD5EA", text: "#2A5F8F" },
  { key: "work_minutes",     label: "仕事", emoji: "💼", bg: "#DCDCDA", text: "#555553" },
];

const ROLE_EMOJI: Record<RoleCategory, string> = {
  creator: "🎵", health: "🌿", work: "💼",
  relationship: "💛", learning: "🌍", selfcare: "🕯",
};

const MILESTONE_CATEGORIES: RoleCategory[] = ["creator", "health", "work", "relationship", "learning", "selfcare"];

const BAR_MAX_HEIGHT = 130;

function sumActivity(log: DailyLog): number {
  return ACTIVITY_CONFIG.reduce((sum, a) => sum + ((log[a.key] as number) || 0), 0);
}

function fmtMinutes(total: number): string {
  if (total >= 60) return `${Math.floor(total / 60)}h${total % 60 ? total % 60 + "m" : ""}`;
  return `${total}分`;
}

// ─── メインページ ─────────────────────────────────────────────

export default function ReportPage() {
  const supabase = createClient();
  const [viewMode, setViewMode] = useState<"week" | "month">("week");

  const [weekOffset, setWeekOffset] = useState(0);
  const [weekLogs, setWeekLogs] = useState<DailyLog[]>([]);

  const [monthOffset, setMonthOffset] = useState(0);
  const [monthLogs, setMonthLogs] = useState<DailyLog[]>([]);

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [monthGoals, setMonthGoals] = useState<(Goal & { completedTaskCount: number; totalTaskCount: number })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState<RoleCategory>("creator");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isSaving, setIsSaving] = useState(false);

  const today = new Date();
  const weekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const monthStart = startOfMonth(addMonths(today, monthOffset));
  const monthEnd = endOfMonth(monthStart);
  const monthWeekStarts = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });

  // 週データ取得
  useEffect(() => {
    async function loadWeek() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const weekEndStr = format(addDays(weekStart, 6), "yyyy-MM-dd");
      const { data: logs } = await supabase.from("daily_logs").select("*")
        .eq("user_id", user.id)
        .gte("date", weekStartStr)
        .lte("date", weekEndStr);
      setWeekLogs((logs || []) as DailyLog[]);
    }
    loadWeek();
  }, [weekOffset]);

  // 月データ取得
  useEffect(() => {
    async function loadMonth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const monthStartStr = format(monthStart, "yyyy-MM-dd");
      const monthEndStr = format(monthEnd, "yyyy-MM-dd");
      const { data: logs } = await supabase.from("daily_logs").select("*")
        .eq("user_id", user.id)
        .gte("date", monthStartStr)
        .lte("date", monthEndStr);
      setMonthLogs((logs || []) as DailyLog[]);
    }
    loadMonth();
  }, [monthOffset]);

  // マイルストーン取得（初回のみ・全期間共通の達成記録一覧）
  useEffect(() => {
    async function loadMilestones() {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: ms } = await supabase.from("milestones").select("*")
        .eq("user_id", user.id)
        .order("achieved_date", { ascending: false })
        .limit(50);
      setMilestones((ms || []) as Milestone[]);
      setIsLoading(false);
    }
    loadMilestones();
  }, []);

  // ─── 月次ゴール達成状況 ──────────────────────────────────────
  useEffect(() => {
    async function loadMonthGoals() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const now = new Date();
      const monthStart = format(new Date(now.getFullYear(), now.getMonth() - monthOffset, 1), "yyyy-MM-dd");
      const monthEnd = format(new Date(now.getFullYear(), now.getMonth() - monthOffset + 1, 0), "yyyy-MM-dd");
      const { data: gs } = await supabase
        .from("goals")
        .select("*, goal_tasks(id, is_completed)")
        .eq("user_id", user.id)
        .gte("event_date", monthStart)
        .lte("event_date", monthEnd)
        .order("event_date");
      setMonthGoals(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (gs || []).map((g: any) => ({
          ...g,
          totalTaskCount: (g.goal_tasks || []).length,
          completedTaskCount: (g.goal_tasks || []).filter((t: any) => t.is_completed).length,
        }))
      );
    }
    loadMonthGoals();
  }, [monthOffset]);

  // ─── マイルストーン追加 ────────────────────────────────────

  async function addMilestone() {
    if (!newTitle.trim()) return;
    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: inserted } = await supabase.from("milestones").insert({
      user_id: user.id,
      category: newCategory,
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      achieved_date: newDate,
    }).select().single();

    if (inserted) {
      setMilestones((prev) =>
        [inserted as Milestone, ...prev].sort((a, b) => b.achieved_date.localeCompare(a.achieved_date))
      );
    }

    setNewTitle("");
    setNewDescription("");
    setNewDate(format(new Date(), "yyyy-MM-dd"));
    setNewCategory("creator");
    setShowAddModal(false);
    setIsSaving(false);
  }

  async function deleteMilestone(id: string) {
    await supabase.from("milestones").delete().eq("id", id);
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  }

  // ─── 週の集計 ──────────────────────────────────────────────

  function logForDay(day: Date): DailyLog | undefined {
    return weekLogs.find((l) => isSameDay(new Date(l.date), day));
  }

  const dayTotals = weekDays.map((day) => {
    const log = logForDay(day);
    const segments = ACTIVITY_CONFIG.map((a) => ({
      ...a,
      minutes: log ? (log[a.key] as number) || 0 : 0,
    }));
    const total = segments.reduce((sum, s) => sum + s.minutes, 0);
    return { day, segments, total };
  });

  const weekMax = Math.max(...dayTotals.map((d) => d.total), 60);

  const weekCategoryTotals = ACTIVITY_CONFIG.map((a) => ({
    ...a,
    total: weekLogs.reduce((sum, log) => sum + ((log[a.key] as number) || 0), 0),
  }));

  // ─── 月の集計 ──────────────────────────────────────────────

  const monthWeeklyTotals = monthWeekStarts.map((ws, i) => {
    const wsStr = format(ws, "yyyy-MM-dd");
    const weStr = format(addDays(ws, 6), "yyyy-MM-dd");
    const total = monthLogs
      .filter((l) => l.date >= wsStr && l.date <= weStr)
      .reduce((sum, log) => sum + sumActivity(log), 0);
    return { index: i, total };
  });

  const monthWeekMax = Math.max(...monthWeeklyTotals.map((w) => w.total), 60);

  const monthCategoryTotals = ACTIVITY_CONFIG.map((a) => ({
    ...a,
    total: monthLogs.reduce((sum, log) => sum + ((log[a.key] as number) || 0), 0),
  }));

  const monthActiveDays = monthLogs.filter((log) => sumActivity(log) > 0).length;
  const monthDayCount = monthEnd.getDate();
  const monthTotalMinutes = monthCategoryTotals.reduce((sum, a) => sum + a.total, 0);

  const topMonthCategory = [...monthCategoryTotals].sort((a, b) => b.total - a.total)[0];

  // ─── レンダリング ──────────────────────────────────────────

  return (
    <div className="px-5 pt-safe pt-5 pb-10 space-y-5">

      {/* ヘッダー */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-2xl font-medium text-charcoal">積み上げレポート</h1>
      </motion.div>

      {/* 週間／月間 切り替えタブ */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-1 bg-white rounded-2xl p-1 shadow-sm"
      >
        <button
          onClick={() => setViewMode("week")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            viewMode === "week" ? "bg-sage text-white" : "text-muted-foreground"
          }`}
        >
          週間
        </button>
        <button
          onClick={() => setViewMode("month")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
            viewMode === "month" ? "bg-sage text-white" : "text-muted-foreground"
          }`}
        >
          月間
        </button>
      </motion.div>

      {viewMode === "week" ? (
        <>
          {/* 週ナビゲーション */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between bg-white rounded-2xl px-3 py-2.5 shadow-sm"
          >
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="p-2 rounded-xl active:bg-mist"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-sm font-medium text-charcoal">
              {format(weekStart, "M/d", { locale: ja })} 〜 {format(addDays(weekStart, 6), "M/d", { locale: ja })}
              {weekOffset === 0 && <span className="ml-1.5 text-[10px] text-sage">今週</span>}
            </span>
            <button
              onClick={() => setWeekOffset((w) => Math.min(w + 1, 0))}
              disabled={weekOffset >= 0}
              className="p-2 rounded-xl active:bg-mist disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </motion.div>

          {/* 日別積み上げグラフ */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-3xl p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-charcoal mb-4">1日の積み上げ</p>

            <div className="flex items-end justify-between gap-2" style={{ height: BAR_MAX_HEIGHT + 30 }}>
              {dayTotals.map(({ day, segments, total }) => (
                <div key={day.toISOString()} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className="w-full flex flex-col-reverse rounded-lg overflow-hidden"
                    style={{ height: BAR_MAX_HEIGHT, justifyContent: "flex-start" }}
                  >
                    {total === 0 ? (
                      <div className="w-full bg-mist rounded-lg" style={{ height: 3 }} />
                    ) : (
                      segments
                        .filter((s) => s.minutes > 0)
                        .map((s) => (
                          <div
                            key={s.key}
                            style={{
                              height: `${(s.minutes / weekMax) * BAR_MAX_HEIGHT}px`,
                              backgroundColor: s.bg,
                            }}
                          />
                        ))
                    )}
                  </div>
                  <span className={`text-[10px] ${isToday(day) ? "text-sage font-medium" : "text-muted-foreground"}`}>
                    {format(day, "E", { locale: ja })}
                  </span>
                </div>
              ))}
            </div>

            {/* 凡例 */}
            <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-4 pt-4 border-t border-mist">
              {ACTIVITY_CONFIG.map((a) => (
                <div key={a.key} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.bg }} />
                  <span className="text-[10px] text-muted-foreground">{a.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* カテゴリ別週合計 */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-2.5"
          >
            {weekCategoryTotals.map((a) => (
              <div key={a.key} className="bg-white rounded-2xl p-3.5 shadow-sm">
                <div className="flex items-center gap-1">
                  <span className="text-sm">{a.emoji}</span>
                  <span className="text-[11px] text-muted-foreground">{a.label}</span>
                </div>
                <p className="text-lg font-medium text-charcoal mt-1">{fmtMinutes(a.total)}</p>
              </div>
            ))}
          </motion.div>
        </>
      ) : (
        <>
          {/* 月ナビゲーション */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between bg-white rounded-2xl px-3 py-2.5 shadow-sm"
          >
            <button
              onClick={() => setMonthOffset((m) => m - 1)}
              className="p-2 rounded-xl active:bg-mist"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <span className="text-sm font-medium text-charcoal">
              {format(monthStart, "yyyy年M月", { locale: ja })}
              {monthOffset === 0 && <span className="ml-1.5 text-[10px] text-sage">今月</span>}
            </span>
            <button
              onClick={() => setMonthOffset((m) => Math.min(m + 1, 0))}
              disabled={monthOffset >= 0}
              className="p-2 rounded-xl active:bg-mist disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </motion.div>

          {/* 今月のあなた サマリーカード */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-charcoal rounded-3xl p-5 shadow-sm text-ivory"
          >
            <p className="text-sm font-medium mb-1">{format(monthStart, "M月", { locale: ja })}のあなた</p>
            <p className="text-[11px] text-ivory/60 mb-4">
              積み上げ合計 {fmtMinutes(monthTotalMinutes)}
              {monthTotalMinutes > 0 && topMonthCategory.total > 0 && (
                <> ・ いちばん積み上げたのは {topMonthCategory.emoji} {topMonthCategory.label}</>
              )}
            </p>

            <div className="space-y-2">
              {monthCategoryTotals
                .filter((a) => a.total > 0)
                .sort((a, b) => b.total - a.total)
                .map((a) => (
                  <div key={a.key} className="flex items-center gap-2.5">
                    <span className="text-base w-5">{a.emoji}</span>
                    <span className="text-xs text-ivory/80 w-9">{a.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-ivory/15 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (a.total / Math.max(monthTotalMinutes, 1)) * 100)}%`,
                          backgroundColor: a.bg,
                        }}
                      />
                    </div>
                    <span className="text-xs text-ivory/90 w-12 text-right">{fmtMinutes(a.total)}</span>
                  </div>
                ))}
              {monthCategoryTotals.every((a) => a.total === 0) && (
                <p className="text-xs text-ivory/50">まだ記録がありません</p>
              )}
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t border-ivory/10">
              <span className="text-[11px] text-ivory/60">活動日数</span>
              <span className="text-sm font-medium">{monthActiveDays} / {monthDayCount}日</span>
            </div>
          </motion.div>

          {/* 週ごとの積み上げ（月内） */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-charcoal mb-4">週ごとの積み上げ</p>
            <div className="flex items-end justify-between gap-3" style={{ height: BAR_MAX_HEIGHT + 24 }}>
              {monthWeeklyTotals.map(({ index, total }) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-1.5">
                  <div
                    className="w-full flex flex-col-reverse rounded-lg overflow-hidden"
                    style={{ height: BAR_MAX_HEIGHT, justifyContent: "flex-start" }}
                  >
                    <div
                      className="w-full bg-sage rounded-lg"
                      style={{ height: total === 0 ? 3 : `${(total / monthWeekMax) * BAR_MAX_HEIGHT}px` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">第{index + 1}週</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* カテゴリ別月合計 */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-3 gap-2.5"
          >
            {monthCategoryTotals.map((a) => (
              <div key={a.key} className="bg-white rounded-2xl p-3.5 shadow-sm">
                <div className="flex items-center gap-1">
                  <span className="text-sm">{a.emoji}</span>
                  <span className="text-[11px] text-muted-foreground">{a.label}</span>
                </div>
                <p className="text-lg font-medium text-charcoal mt-1">{fmtMinutes(a.total)}</p>
              </div>
            ))}
          </motion.div>
        </>
      )}

      {/* マイルストーン（達成記録）*/}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        {/* ゴール達成状況 */}
        {monthGoals.length > 0 && (
          <div className="bg-white rounded-3xl p-5 shadow-sm space-y-3">
            <p className="text-sm font-medium text-charcoal">🎯 今月のゴール</p>
            {monthGoals.map((g) => {
              const pct = g.totalTaskCount > 0 ? Math.round((g.completedTaskCount / g.totalTaskCount) * 100) : 0;
              return (
                <a key={g.id} href={`/goals/${g.id}`} className="block">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-charcoal truncate flex-1 mr-2">{g.title}</p>
                    <span className={`text-xs font-bold shrink-0 ${g.is_completed ? "text-sage" : pct >= 80 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {g.is_completed ? "✓ 達成" : `${pct}%`}
                    </span>
                  </div>
                  <div className="h-1.5 bg-mist rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: g.is_completed ? "#9DBF98" : "#F5C842" }} />
                  </div>
                </a>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-sage" />
            <p className="text-sm font-medium text-charcoal">達成の記録</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1 text-xs text-sage font-medium px-3 py-1.5 rounded-full bg-sage/10"
          >
            <Plus className="w-3.5 h-3.5" />
            記録する
          </button>
        </div>

        {milestones.length === 0 ? (
          <div className="bg-white rounded-3xl p-6 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">
              まだ達成記録がありません。<br />
              「できるようになったこと」を記録してみよう。
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {milestones.map((m) => {
              const colors = ROLE_CATEGORY_COLORS[m.category];
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                    style={{ backgroundColor: colors.bg }}
                  >
                    {ROLE_EMOJI[m.category]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {ROLE_CATEGORY_LABELS[m.category]}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(m.achieved_date), "M月d日", { locale: ja })}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-charcoal mt-1">{m.title}</p>
                    {m.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{m.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => deleteMilestone(m.id)}
                    className="text-muted-foreground/50 text-xs shrink-0 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ─── マイルストーン追加モーダル ─── */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-50 flex items-end justify-center"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="bg-ivory w-full max-w-md rounded-t-3xl p-5 pb-8 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <p className="text-base font-medium text-charcoal">達成を記録する</p>
                <button onClick={() => setShowAddModal(false)} className="p-1">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {/* カテゴリ選択 */}
              <div className="grid grid-cols-3 gap-2">
                {MILESTONE_CATEGORIES.map((cat) => {
                  const colors = ROLE_CATEGORY_COLORS[cat];
                  const isSelected = newCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setNewCategory(cat)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-2xl border-2 transition-all ${
                        isSelected ? "border-sage" : "border-transparent bg-white"
                      }`}
                      style={isSelected ? { backgroundColor: colors.bg + "40" } : {}}
                    >
                      <span className="text-lg">{ROLE_EMOJI[cat]}</span>
                      <span className="text-[10px] text-charcoal">{ROLE_CATEGORY_LABELS[cat]}</span>
                    </button>
                  );
                })}
              </div>

              {/* タイトル */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">できるようになったこと</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="例：エリーゼのためにが弾けるようになった"
                  className="w-full text-sm text-charcoal bg-white rounded-xl px-3 py-2.5 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* 説明（任意） */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">メモ（任意）</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="詳細や背景があれば"
                  className="w-full text-sm text-charcoal bg-white rounded-xl px-3 py-2.5 focus:outline-none resize-none"
                  rows={2}
                />
              </div>

              {/* 日付 */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">達成日</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  max={format(new Date(), "yyyy-MM-dd")}
                  className="w-full text-sm text-charcoal bg-white rounded-xl px-3 py-2.5 focus:outline-none"
                />
              </div>

              <motion.button
                onClick={addMilestone}
                disabled={!newTitle.trim() || isSaving}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl bg-sage text-white font-medium text-sm disabled:opacity-40"
              >
                {isSaving ? "保存中..." : "記録する"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
