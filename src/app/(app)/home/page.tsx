"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { format, startOfWeek, addDays, isSameDay, isToday } from "date-fns";
import { ja } from "date-fns/locale";
import { ArrowRight, Plus, Sparkles, Moon, Sun, Inbox, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMorningMessage } from "@/lib/pet/getPetMessage";
import {
  UserProfile, Role, DailyCheckin, Task, Schedule,
  PetType, EnergyLevel, DayMode, ROLE_CATEGORY_COLORS, MODE_LABELS, TaskStatus,
} from "@/types";

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
  10:  { attack: "約1時間",   progress: "約1時間",   maintain: "約1時間",   protect: "約30分",   recover: "約30分"   },
  40:  { attack: "約3時間",   progress: "約2.5時間", maintain: "約2時間",   protect: "約1.5時間", recover: "約1時間"  },
  70:  { attack: "約6時間",   progress: "約5時間",   maintain: "約4時間",   protect: "約3時間",   recover: "約2時間"  },
  100: { attack: "約8時間",   progress: "約7時間",   maintain: "約6時間",   protect: "約5時間",   recover: "約3時間"  },
};

const ENERGY_LABELS: Record<EnergyLevel, string> = {
  10: "低", 40: "やや低", 70: "普通", 100: "高い",
};

// ─── メインコンポーネント ──────────────────────────────────────

export default function HomePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [checkin, setCheckin] = useState<DailyCheckin | null>(null);
  const [weekSchedules, setWeekSchedules] = useState<Schedule[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [petMessage, setPetMessage] = useState("");
  const [inboxCount, setInboxCount] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newQuadrant, setNewQuadrant] = useState<1 | 2 | 3>(1);
  const [isAdding, setIsAdding] = useState(false);

  const today = new Date();
  const hour = today.getHours();
  const isEvening = hour >= 18;
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const todayStr = format(today, "yyyy-MM-dd");
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const weekEndStr = format(addDays(weekStart, 6), "yyyy-MM-dd");

      const [{ data: p }, { data: r }, { data: c }, { data: s }, { data: t }, { count: ic }] = await Promise.all([
        supabase.from("users_profile").select("name,selected_pet,life_vision").eq("user_id", user.id).single(),
        supabase.from("roles").select("id,title,category,dream,gap,monthly_goal,vision_photo_url,values,progress").eq("user_id", user.id).order("display_order").limit(6),
        supabase.from("daily_checkins").select("*").eq("user_id", user.id)
          .eq("date", todayStr).maybeSingle(),
        supabase.from("schedules").select("id,title,start_time,role_id,is_all_day")
          .eq("user_id", user.id)
          .gte("start_time", `${weekStartStr}T00:00:00`)
          .lte("start_time", `${weekEndStr}T23:59:59`),
        supabase.from("tasks").select("*")
          .eq("user_id", user.id)
          .eq("due_date", todayStr)
          .order("quadrant")
          .limit(30),
        supabase.from("inbox_items").select("*", { count: "exact", head: true })
          .eq("user_id", user.id).eq("status", "open"),
      ]);

      setProfile(p as unknown as UserProfile);
      setRoles((r || []) as unknown as Role[]);
      setCheckin(c);
      setWeekSchedules((s || []) as unknown as Schedule[]);
      setTodayTasks(t || []);
      setInboxCount(ic ?? 0);

      const pet = (p?.selected_pet || "cat") as PetType;
      setPetMessage(getMorningMessage(pet, c?.mode, c?.energy));
    }
    load();
  }, []);

  // ─── ヘルパー ──────────────────────────────────────────────

  function getSchedulesForDay(day: Date) {
    return weekSchedules.filter(s => isSameDay(new Date(s.start_time), day));
  }

  function getRoleForId(roleId: string | null) {
    return roles.find(r => r.id === roleId) || null;
  }

  async function addTask() {
    if (!newTitle.trim()) return;
    setIsAdding(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const todayStr = format(today, "yyyy-MM-dd");
    const { data: inserted } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: newTitle.trim(),
      quadrant: newQuadrant,
      due_date: todayStr,
      status: "todo",
    }).select().single();
    if (inserted) setTodayTasks((prev) => [...prev, inserted as Task]);
    setNewTitle("");
    setNewQuadrant(1);
    setShowAddForm(false);
    setIsAdding(false);
  }

  async function toggleDone(taskId: string) {
    const task = todayTasks.find((t) => t.id === taskId);
    if (!task) return;
    const newStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
    setTodayTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
  }

  const petType = (profile?.selected_pet || "cat") as PetType;
  const modeInfo = checkin?.mode ? MODE_CONFIG[checkin.mode] : null;
  const modeLabel = checkin?.mode ? MODE_LABELS[checkin.mode] : null;
  const availableHours = checkin?.energy && checkin?.mode
    ? ENERGY_HOURS[checkin.energy][checkin.mode]
    : null;

  // ─── レンダリング ──────────────────────────────────────────

  return (
    <div className="px-5 pt-safe pt-5 pb-10 space-y-4">

      {/* ① 日付 + ペット */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-4"
      >
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
          {petMessage && (
            <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed max-w-[220px]">
              {petMessage}
            </p>
          )}
        </div>
        <div className="shrink-0">
          <div className="w-14 h-14 rounded-3xl bg-sage/12 flex items-center justify-center text-[28px]">
            {petType === "cat" ? "🐱" : petType === "dog" ? "🐶" : "🤖"}
          </div>
        </div>
      </motion.div>

      {/* ② チェックイン */}
      <AnimatePresence mode="wait">
        {!checkin ? (
          <motion.div
            key="cta"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
          >
            <Link href="/checkin">
              <div className="bg-white rounded-3xl px-5 py-4 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-transform">
                <div className="w-11 h-11 rounded-2xl bg-blush/50 flex items-center justify-center text-xl shrink-0">
                  💭
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-charcoal">今日の気分をチェックイン</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">感情に合わせてプランを作ります</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="status"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
          >
            <div
              className="rounded-3xl px-5 py-4 shadow-sm"
              style={{
                background: modeInfo
                  ? `linear-gradient(135deg, white 60%, ${modeInfo.accentColor}22)`
                  : "white",
              }}
            >
              <div className="flex items-center gap-3">
                {/* モードバッジ */}
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: modeInfo ? modeInfo.accentColor + "30" : "#F0EEE9" }}
                >
                  {modeInfo?.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-charcoal">{modeLabel}</span>
                    <span className="text-[10px] text-muted-foreground">
                      エネルギー: {ENERGY_LABELS[checkin.energy]}
                    </span>
                  </div>
                  {/* Energy bar */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-mist rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: modeInfo?.accentColor || "#8FA888" }}
                        initial={{ width: 0 }}
                        animate={{ width: `${checkin.energy}%` }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                      />
                    </div>
                    <span className="text-[10px] text-charcoal font-medium shrink-0">
                      {checkin.energy}%
                    </span>
                  </div>
                </div>
                {/* 使える時間 */}
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

      {/* ③ 今日の3 Role Plan */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-medium text-charcoal">今日の Role Plan</h2>
          <Link href="/today" className="flex items-center gap-1 text-[11px] text-sage">
            <Sparkles className="w-3 h-3" />
            プランを生成
          </Link>
        </div>

        {roles.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center shadow-sm">
            <p className="text-3xl mb-3">✦</p>
            <p className="text-sm font-medium text-charcoal">まだRoleがありません</p>
            <p className="text-[11px] text-muted-foreground mt-1 mb-4">役割を追加して夢の管理を始めましょう</p>
            <Link href="/roles/new" className="inline-flex items-center gap-1.5 bg-sage text-white text-sm px-5 py-2.5 rounded-2xl">
              <Plus className="w-4 h-4" />Roleを追加
            </Link>
          </div>
        ) : (
          <div className="space-y-2.5">
            {roles.slice(0, 3).map((role, i) => {
              const colors = ROLE_CATEGORY_COLORS[role.category];
              return (
                <motion.div
                  key={role.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.14 + i * 0.07 }}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm"
                >
                  <div className="flex">
                    {/* 左カラーライン */}
                    <div className="w-1 shrink-0" style={{ backgroundColor: colors.border }} />
                    <div className="flex-1 px-4 py-3.5">
                      {/* ロール名 + ステータス */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg leading-none">{ROLE_EMOJI[role.category]}</span>
                        <span className="text-sm font-medium text-charcoal flex-1">{role.title}</span>
                        {checkin && (
                          <span
                            className="text-[9px] px-2 py-0.5 rounded-full font-medium shrink-0"
                            style={{ backgroundColor: colors.bg, color: colors.text }}
                          >
                            {modeInfo?.emoji} {modeLabel}
                          </span>
                        )}
                      </div>

                      {/* Dream */}
                      {role.dream && (
                        <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
                          ✦ {role.dream.length > 52 ? role.dream.slice(0, 52) + "…" : role.dream}
                        </p>
                      )}

                      {/* Gap highlight */}
                      {role.gap && (
                        <div
                          className="rounded-xl px-3 py-2 mb-2"
                          style={{ backgroundColor: colors.bg + "70" }}
                        >
                          <p className="text-[10px] font-medium mb-0.5" style={{ color: colors.text }}>
                            今のGap
                          </p>
                          <p className="text-[11px] leading-relaxed" style={{ color: colors.text }}>
                            {role.gap.length > 60 ? role.gap.slice(0, 60) + "…" : role.gap}
                          </p>
                        </div>
                      )}

                      {/* 今日のフォーカス（月次目標があれば） */}
                      {role.monthly_goal && (
                        <p className="text-[11px] text-charcoal mb-2">
                          <span className="text-muted-foreground">今月: </span>
                          {role.monthly_goal.length > 48 ? role.monthly_goal.slice(0, 48) + "…" : role.monthly_goal}
                        </p>
                      )}

                      {/* CTA */}
                      <Link href="/today" className="inline-flex items-center gap-1 text-sage">
                        <span className="text-[11px]">今日の行動を計画する</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {roles.length > 3 && (
              <Link href="/roles" className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground py-1">
                他{roles.length - 3}つのRoleを見る <ArrowRight className="w-3 h-3" />
              </Link>
            )}
          </div>
        )}
      </motion.div>

      {/* ④ 週のRole時間割 */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-medium text-charcoal">今週の時間割</h2>
          <Link href="/calendar" className="flex items-center gap-0.5 text-[11px] text-sage">
            カレンダー <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white rounded-3xl px-4 py-4 shadow-sm">
          {/* 曜日ヘッダー */}
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-2" style={{ minWidth: "calc(7 * 46px + 6 * 8px)" }}>
              {weekDays.map((day, i) => {
                const daySchedules = getSchedulesForDay(day);
                const isTodayDay = isToday(day);
                const isPast = day < today && !isTodayDay;
                return (
                  <Link
                    key={i}
                    href={`/calendar?date=${format(day, "yyyy-MM-dd")}`}
                    className="flex flex-col items-center gap-1.5 flex-1"
                    style={{ minWidth: "46px" }}
                  >
                    {/* 曜日 */}
                    <span
                      className={`text-[10px] font-medium ${
                        isTodayDay ? "text-sage" : isPast ? "text-muted-foreground/50" : "text-muted-foreground"
                      }`}
                    >
                      {format(day, "E", { locale: ja })}
                    </span>

                    {/* 日付サークル */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                        isTodayDay
                          ? "bg-sage text-white"
                          : isPast
                          ? "text-muted-foreground/40"
                          : "text-charcoal"
                      }`}
                    >
                      {format(day, "d")}
                    </div>

                    {/* スケジュールチップ */}
                    <div className="flex flex-col gap-0.5 w-full">
                      {daySchedules.length === 0 ? (
                        <div className="h-1 rounded-full bg-mist" />
                      ) : (
                        <>
                          {daySchedules.slice(0, 3).map((s) => {
                            const role = getRoleForId(s.role_id);
                            const colors = role
                              ? ROLE_CATEGORY_COLORS[role.category]
                              : { bg: "#E8E6E0", text: "#888680", border: "#C8C5BC" };
                            return (
                              <div
                                key={s.id}
                                className="w-full h-4 rounded px-1 flex items-center gap-0.5 overflow-hidden"
                                style={{ backgroundColor: colors.bg }}
                              >
                                {role && (
                                  <span className="text-[8px] leading-none shrink-0">
                                    {ROLE_EMOJI[role.category]}
                                  </span>
                                )}
                                <span
                                  className="text-[8px] truncate leading-none"
                                  style={{ color: colors.text }}
                                >
                                  {s.title}
                                </span>
                              </div>
                            );
                          })}
                          {daySchedules.length > 3 && (
                            <span className="text-[8px] text-muted-foreground text-center leading-none">
                              +{daySchedules.length - 3}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Role凡例 */}
          {roles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-mist">
              {roles.map((role) => {
                const colors = ROLE_CATEGORY_COLORS[role.category];
                return (
                  <div
                    key={role.id}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px]"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    <span>{ROLE_EMOJI[role.category]}</span>
                    <span>{role.title}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* ⑤ 今日のTODO */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-medium text-charcoal">今日のTODO</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="flex items-center gap-0.5 text-[11px] text-sage"
            >
              <Plus className="w-3.5 h-3.5" />
              追加
            </button>
            <Link href="/today" className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              {todayTasks.length > 0 ? "AI更新" : "AI生成"}
            </Link>
          </div>
        </div>

        {/* 手動追加フォーム */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTask()}
                  placeholder="タスクを入力…"
                  autoFocus
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-sage/30"
                />
                {/* 重要度選択 */}
                <div className="flex gap-2">
                  {([
                    { q: 1, label: "重要・緊急", color: "#F5CCC8" },
                    { q: 2, label: "重要", color: "#C8DBC6" },
                    { q: 3, label: "緊急", color: "#BDD5EA" },
                  ] as const).map(({ q, label, color }) => (
                    <button
                      key={q}
                      onClick={() => setNewQuadrant(q)}
                      className="flex-1 py-1.5 rounded-xl text-[10px] font-medium transition-all border"
                      style={{
                        backgroundColor: newQuadrant === q ? color : "transparent",
                        borderColor: newQuadrant === q ? color : "#E0DDD8",
                        color: newQuadrant === q ? "#444" : "#999",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addTask}
                    disabled={!newTitle.trim() || isAdding}
                    className="flex-1 py-2 rounded-xl bg-sage text-white text-sm font-medium disabled:opacity-40"
                  >
                    追加
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setNewTitle(""); }}
                    className="w-10 py-2 rounded-xl border border-border flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {todayTasks.length === 0 ? (
          <Link href={checkin ? "/today" : "/checkin"}>
            <div className="bg-white rounded-3xl p-6 text-center shadow-sm active:scale-[0.98] transition-transform">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm font-medium text-charcoal">まだ今日のTODOがありません</p>
              <p className="text-[11px] text-muted-foreground mt-1 mb-3 leading-relaxed">
                {checkin
                  ? "AIで今日のプランを作って保存しよう"
                  : "まずチェックインして気分を教えよう"}
              </p>
              <span className="text-[11px] text-sage">
                {checkin ? "プランを生成する →" : "チェックインする →"}
              </span>
            </div>
          </Link>
        ) : (
          <div className="space-y-3">
            {([
              { q: 1, label: "重要・緊急", color: "#F5CCC8" },
              { q: 2, label: "重要・急がない", color: "#C8DBC6" },
              { q: 3, label: "緊急・重要でない", color: "#BDD5EA" },
            ] as const).map(({ q, label, color }) => {
              const qTasks = todayTasks.filter((t) => t.quadrant === q);
              if (qTasks.length === 0) return null;
              return (
                <div key={q}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span
                      className="text-[10px] px-2.5 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: color, color: "#444" }}
                    >
                      {label}
                    </span>
                  </div>
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                    {qTasks.slice(0, 5).map((task) => {
                      const role = getRoleForId(task.role_id);
                      const colors = role ? ROLE_CATEGORY_COLORS[role.category] : null;
                      const isDone = task.status === "done";
                      return (
                        <motion.div
                          key={task.id}
                          layout
                          className="flex items-center gap-3 px-4 py-3.5 border-b border-mist last:border-0"
                        >
                          <button
                            onClick={() => toggleDone(task.id)}
                            className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                            style={{
                              borderColor: isDone ? "#9DBF98" : colors?.border || "#D8D5CC",
                              backgroundColor: isDone ? "#9DBF98" : "transparent",
                            }}
                          >
                            {isDone && <span className="text-white text-[9px] font-bold">✓</span>}
                          </button>
                          <span
                            className={`text-sm flex-1 truncate transition-colors ${
                              isDone
                                ? "line-through text-muted-foreground/60"
                                : "text-charcoal"
                            }`}
                          >
                            {task.title}
                          </span>
                          {!isDone && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {task.estimated_minutes && (
                                <span className="text-[10px] text-muted-foreground">
                                  {task.estimated_minutes}分
                                </span>
                              )}
                              {role && colors && (
                                <span
                                  className="text-[9px] px-1.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: colors.bg, color: colors.text }}
                                >
                                  {ROLE_EMOJI[role.category]}
                                </span>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {todayTasks.filter((t) => t.status === "done").length > 0 && (
              <p className="text-[11px] text-center text-muted-foreground pt-1">
                ✓ {todayTasks.filter((t) => t.status === "done").length}件完了 — タップで元に戻せます
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* Inbox shortcut */}
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
            <span className="text-[11px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-medium">
              {inboxCount}
            </span>
            <ArrowRight className="w-4 h-4 text-stone-300" />
          </div>
        </Link>
      )}

      {/* ⑥ 夜の振り返り / 週次レビュー */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Link href="/weekly-review">
          <div
            className="rounded-3xl px-5 py-4 flex items-center gap-4 active:scale-[0.98] transition-transform shadow-sm"
            style={{
              background: isEvening
                ? "linear-gradient(135deg, #2D2B35 0%, #1A1A24 100%)"
                : "white",
            }}
          >
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
              style={{
                backgroundColor: isEvening ? "rgba(255,255,255,0.1)" : "#E8DDD0",
              }}
            >
              {isEvening ? <Moon className="w-5 h-5 text-white/80" /> : <Sun className="w-5 h-5 text-amber-600" />}
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
  );
}
