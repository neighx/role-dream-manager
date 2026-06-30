"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  Calendar, Sparkles, RefreshCw, Zap, Moon, TrendingUp, Clock,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  GeneratedTodayTask, TodayPlanResult, DailyCheckin, Role, UserProfile,
  PetType, RegenerationMode, ROLE_CATEGORY_COLORS, MODE_LABELS,
} from "@/types";

// ─── 定数 ──────────────────────────────────────────────────────

const QUADRANT_CONFIG: Record<number, { label: string; desc: string; color: string; icon: React.ReactNode }> = {
  1: { label: "重要・緊急",         desc: "今日やらないと困る",    color: "#F5CCC8", icon: <AlertCircle className="w-3.5 h-3.5" /> },
  2: { label: "重要・緊急でない",   desc: "夢に効く本命行動",     color: "#C8DBC6", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  3: { label: "緊急・重要でない",   desc: "急いでいるが本質でない", color: "#BDD5EA", icon: <Clock className="w-3.5 h-3.5" /> },
  4: { label: "今日はやらない",     desc: "後回しでよい",          color: "#E8E6E0", icon: <Moon className="w-3.5 h-3.5" /> },
};

const ROLE_EMOJI: Record<string, string> = {
  creator: "🎵", health: "🌿", work: "💼",
  relationship: "💛", learning: "🌍", selfcare: "🕯",
};

const REGEN_BUTTONS: Array<{
  mode: RegenerationMode;
  label: string;
  icon: string;
}> = [
  { mode: "lighter",        label: "もう少し軽くする",   icon: "🪶" },
  { mode: "stronger",       label: "もっと攻める",       icon: "⚡" },
  { mode: "shorter",        label: "10分版にする",       icon: "⏱" },
  { mode: "focus_money",    label: "売上直結に寄せる",   icon: "💰" },
  { mode: "focus_recovery", label: "回復優先にする",     icon: "🌙" },
  { mode: "balanced",       label: "Roleバランスを整える", icon: "⚖️" },
];

const ACTION_SIZE_LABELS: Record<string, string> = {
  attack:  "⚡ 全力",
  normal:  "➡ 通常",
  small:   "🌱 小さく",
  minimum: "🤏 最小限",
};

// ─── メインページ ─────────────────────────────────────────────

export default function TodayPage() {
  const supabase = createClient();
  const [checkin, setCheckin] = useState<DailyCheckin | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [planResult, setPlanResult] = useState<TodayPlanResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingMode, setGeneratingMode] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [phase, setPhase] = useState<"select" | "plan">("select");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const today = new Date();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const todayStr = format(today, "yyyy-MM-dd");

      const [{ data: c }, { data: r }, { data: p }] = await Promise.all([
        supabase.from("daily_checkins").select("*").eq("user_id", user.id)
          .eq("date", todayStr).maybeSingle(),
        supabase.from("roles").select("*").eq("user_id", user.id).order("display_order"),
        supabase.from("users_profile").select("*").eq("user_id", user.id).single(),
      ]);

      setCheckin(c);
      setRoles(r || []);
      setProfile(p);
      if (c?.selected_role_ids?.length) setSelectedRoleIds(c.selected_role_ids);

      // 今日のプランが既に生成済みか確認
      const { data: dp } = await supabase
        .from("daily_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", todayStr)
        .maybeSingle();

      if (dp) {
        // 今日のタスクを読み込んでプランを復元
        const { data: savedTasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", user.id)
          .eq("due_date", todayStr)
          .order("quadrant");

        if (savedTasks && savedTasks.length > 0) {
          const roleMap = new Map((r || []).map((role: Role) => [role.id, role]));

          const reconstructedTasks: GeneratedTodayTask[] = savedTasks.map((t) => {
            const role = roleMap.get(t.role_id) as Role | undefined;
            return {
              id: t.id,
              role_id: t.role_id || "",
              role_category: role?.category || "creator",
              role_title: role?.title || "",
              title: t.title,
              description: t.description || "",
              purpose: t.purpose || "",
              gap_addressed: "",
              long_term_connection: t.purpose || "",
              today_reason: "",
              estimated_minutes: t.estimated_minutes || 30,
              difficulty: 3,
              importance: 3,
              urgency: 3,
              quadrant: (t.quadrant || 2) as 1 | 2 | 3 | 4,
              energy_adapted: true,
              stress_adapted: true,
              generated_by: "claude" as const,
              ai_generated: true,
              status: (t.status || "todo") as "todo" | "done" | "skipped",
            };
          });

          const reconstructedResult: TodayPlanResult = {
            tasks: reconstructedTasks,
            meta: {
              overall_message: dp.overall_message || "",
              pet_message: dp.pet_message || "",
              emotional_summary: dp.emotional_summary || "",
              available_time_strategy: dp.available_time_strategy || "",
              not_today: (dp.not_today_json as TodayPlanResult["meta"]["not_today"]) || [],
              reflection_question: dp.reflection_question || "",
              ai_generated: dp.ai_generated || false,
              ai_model: dp.ai_generation_model || undefined,
            },
          };

          setPlanResult(reconstructedResult);
          setPhase("plan");
          setIsSaved(true);
          return;
        }

        // daily_planはあるがtasksなし → 保存済みとしてマーク
        setIsSaved(true);
      }
    }
    load();
  }, []);

  // ─── プラン生成 ────────────────────────────────────────────

  async function generate(regenerationMode?: RegenerationMode) {
    if (!checkin || selectedRoleIds.length === 0) return;
    setIsGenerating(true);
    setGeneratingMode(regenerationMode ?? null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/ai/generate-today-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedRoleIds, regenerationMode, todayStr: format(today, "yyyy-MM-dd") }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = (err as { error?: string }).error ?? "生成失敗";
        setErrorMsg(msg);
        setIsGenerating(false);
        setGeneratingMode(null);
        return;
      }

      const result = (await res.json()) as TodayPlanResult;

      if (result.meta.fallback_reason) {
        setErrorMsg(result.meta.fallback_reason);
      }

      setPlanResult(result);
      setPhase("plan");

      // selected_role_ids を保存
      await supabase.from("daily_checkins")
        .update({ selected_role_ids: selectedRoleIds, pet_message: result.meta.pet_message })
        .eq("id", checkin.id);

      // タスクを自動保存（手動ボタン不要）
      await autoSaveTasks(result);
    } catch (e) {
      console.error(e);
      setErrorMsg("プランの生成に失敗しました。もう一度お試しください。");
    } finally {
      setIsGenerating(false);
      setGeneratingMode(null);
    }
  }

  // 自動保存（再生成時は既存タスクを削除してから保存）
  async function autoSaveTasks(result: TodayPlanResult) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsSaving(true);
    const todayStr = format(today, "yyyy-MM-dd");

    // 既存の今日のタスクを削除（再生成時の重複防止）
    await supabase.from("tasks").delete()
      .eq("user_id", user.id).eq("due_date", todayStr);

    const tasksToSave = result.tasks
      .filter((t) => t.quadrant !== 4)
      .map((t) => ({
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
      await supabase.from("tasks").insert(tasksToSave);
    }

    setIsSaved(true);
    setIsSaving(false);
  }

  function toggleTask(taskId: string) {
    setPlanResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? { ...t, status: t.status === "done" ? "todo" : "done" }
            : t
        ),
      };
    });
  }

  // ─── チェックイン未完了 ────────────────────────────────────

  if (!checkin) {
    return (
      <div className="px-5 pt-safe pt-6 flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-5"
        >
          <div className="text-6xl">💭</div>
          <div>
            <h2 className="text-xl font-medium text-charcoal">まず感情チェックインをしよう</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              今日のあなたの状態を確認して<br />最適なプランをAIが考えます
            </p>
          </div>
          <Link href="/checkin">
            <motion.div
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 bg-sage text-white px-6 py-4 rounded-2xl font-medium"
            >
              チェックインする
            </motion.div>
          </Link>
        </motion.div>
      </div>
    );
  }

  const petType = (profile?.selected_pet || "cat") as PetType;

  // ─── レンダリング ──────────────────────────────────────────

  return (
    <div className="px-5 pt-safe pt-5 pb-10 space-y-4">

      {/* ヘッダー */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div>
          <p className="text-[11px] text-muted-foreground">
            {format(today, "M月d日（E）", { locale: ja })}
          </p>
          <h1 className="text-2xl font-medium text-charcoal">Today's Role Plan</h1>
        </div>
        <Link href="/checkin">
          <div className="bg-white rounded-2xl px-3 py-2 flex items-center gap-1.5 shadow-sm">
            <span className="text-sm">{MODE_LABELS[checkin.mode]}</span>
            <span className="text-[11px] text-muted-foreground">⚡{checkin.energy}%</span>
          </div>
        </Link>
      </motion.div>

      {/* エラー / フォールバック通知 */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[12px] text-amber-700 leading-relaxed">{errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="ml-auto text-amber-400 text-xs shrink-0">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">

        {/* ──────── PHASE: SELECT ──────── */}
        {phase === "select" && (
          <motion.div
            key="select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* ペットメッセージ */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-4 flex items-start gap-3 shadow-sm"
            >
              <div className="w-10 h-10 rounded-2xl bg-sage/15 flex items-center justify-center text-xl shrink-0">
                {petType === "cat" ? "🐱" : petType === "dog" ? "🐶" : "🤖"}
              </div>
              <p className="text-sm text-charcoal leading-relaxed mt-1">
                今日は{MODE_LABELS[checkin.mode]}。<br />
                どのRoleに集中する？（最大3つ）
              </p>
            </motion.div>

            {/* Role選択 */}
            <div className="space-y-2.5">
              {roles.map((role, i) => {
                const isSelected = selectedRoleIds.includes(role.id);
                const isDisabled = !isSelected && selectedRoleIds.length >= 3;
                const colors = ROLE_CATEGORY_COLORS[role.category];

                return (
                  <motion.button
                    key={role.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedRoleIds((ids) => ids.filter((id) => id !== role.id));
                      } else if (!isDisabled) {
                        setSelectedRoleIds((ids) => [...ids, role.id]);
                      }
                    }}
                    disabled={isDisabled}
                    className={`w-full flex items-start gap-3 px-4 py-4 rounded-2xl border-2 text-left transition-all ${
                      isSelected
                        ? "border-sage shadow-sm"
                        : isDisabled
                        ? "border-transparent bg-white/50 opacity-40"
                        : "border-transparent bg-white shadow-sm"
                    }`}
                    style={isSelected ? { backgroundColor: colors.bg + "40" } : {}}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                      style={{ backgroundColor: colors.bg }}
                    >
                      {ROLE_EMOJI[role.category]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-charcoal">{role.title}</p>
                      {role.gap && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          Gap: {role.gap}
                        </p>
                      )}
                      {role.monthly_goal && (
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          今月: {role.monthly_goal}
                        </p>
                      )}
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center mt-0.5 transition-all ${
                        isSelected ? "bg-sage border-sage" : "border-mist"
                      }`}
                    >
                      {isSelected && <span className="text-white text-[9px]">✓</span>}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* 生成ボタン */}
            <motion.button
              onClick={() => generate()}
              disabled={selectedRoleIds.length === 0 || isGenerating}
              whileTap={{ scale: 0.97 }}
              className="w-full py-5 rounded-3xl bg-sage text-white font-medium text-base disabled:opacity-40 flex items-center justify-center gap-2.5 shadow-sm"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  AIがプランを考えています...
                </>
              ) : (
                <>
                  <Sparkles className="w-4.5 h-4.5" />
                  AIで今日のプランを作る
                </>
              )}
            </motion.button>
          </motion.div>
        )}

        {/* ──────── PHASE: PLAN ──────── */}
        {phase === "plan" && planResult && (
          <motion.div
            key="plan"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* 保存ステータスバナー */}
            <AnimatePresence mode="wait">
              {isSaving ? (
                <motion.div
                  key="saving"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-mist rounded-2xl px-4 py-3 flex items-center gap-2 border border-border"
                >
                  <div className="w-4 h-4 border-2 border-sage/30 border-t-sage rounded-full animate-spin shrink-0" />
                  <span className="text-sm text-muted-foreground">TODOに保存中...</span>
                </motion.div>
              ) : isSaved ? (
                <motion.div
                  key="saved"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-sage/10 rounded-2xl px-4 py-3 flex items-center justify-between border border-sage/20"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sage text-base">✓</span>
                    <span className="text-sm text-sage font-medium">TODOに保存しました</span>
                  </div>
                  <Link href="/home" className="text-xs text-sage font-medium">
                    ホームで確認 →
                  </Link>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Overall Message + Pet */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sage/15 flex items-center justify-center text-2xl shrink-0">
                  {petType === "cat" ? "🐱" : petType === "dog" ? "🐶" : "🤖"}
                </div>
                <div className="flex-1 min-w-0">
                  {planResult.meta.pet_message && (
                    <p className="text-sm text-charcoal leading-relaxed">
                      {planResult.meta.pet_message}
                    </p>
                  )}
                  {planResult.meta.overall_message && (
                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                      {planResult.meta.overall_message}
                    </p>
                  )}
                </div>
              </div>

              {/* Emotional summary + time strategy */}
              {(planResult.meta.emotional_summary || planResult.meta.available_time_strategy) && (
                <div className="mt-3 pt-3 border-t border-mist space-y-1">
                  {planResult.meta.emotional_summary && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      💭 {planResult.meta.emotional_summary}
                    </p>
                  )}
                  {planResult.meta.available_time_strategy && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      ⏱ {planResult.meta.available_time_strategy}
                    </p>
                  )}
                </div>
              )}

              {/* AI badge */}
              {planResult.meta.ai_generated && (
                <div className="mt-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-sage" />
                  <span className="text-[9px] text-sage">AI生成 — {planResult.meta.ai_model}</span>
                </div>
              )}
            </motion.div>

            {/* ─── タスク一覧（象限別） ─── */}
            {[1, 2, 3, 4].map((q) => {
              const qTasks = planResult.tasks.filter((t) => t.quadrant === q);
              if (qTasks.length === 0) return null;
              const qInfo = QUADRANT_CONFIG[q];

              return (
                <motion.div
                  key={q}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: q * 0.06 }}
                  className="space-y-2.5"
                >
                  {/* 象限ラベル */}
                  <div className="flex items-center gap-1.5">
                    <div
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium"
                      style={{ backgroundColor: qInfo.color, color: "#444" }}
                    >
                      {qInfo.icon}
                      {qInfo.label}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{qInfo.desc}</span>
                  </div>

                  {qTasks.map((task) => (
                    <AITaskCard
                      key={task.id}
                      task={task}
                      roles={roles}
                      isExpanded={expandedTask === task.id}
                      onToggleExpand={() =>
                        setExpandedTask(expandedTask === task.id ? null : task.id)
                      }
                      onToggleDone={() => toggleTask(task.id)}
                    />
                  ))}
                </motion.div>
              );
            })}

            {/* ─── 今日はやらないこと ─── */}
            {planResult.meta.not_today.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-5 shadow-sm"
              >
                <p className="text-[11px] font-medium text-muted-foreground mb-3">
                  今日はやらないこと
                </p>
                <div className="space-y-2">
                  {planResult.meta.not_today.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[11px] text-muted-foreground mt-0.5">—</span>
                      <div>
                        <p className="text-[12px] text-charcoal line-through">{item.title}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{item.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ─── 夜の振り返り問いかけ ─── */}
            {planResult.meta.reflection_question && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-sage/10 rounded-3xl px-5 py-4"
              >
                <p className="text-[10px] text-sage font-medium mb-1">今夜の振り返り</p>
                <p className="text-sm text-charcoal leading-relaxed">
                  {planResult.meta.reflection_question}
                </p>
              </motion.div>
            )}

            {/* ─── 再生成ボタン群 ─── */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2.5"
            >
              <p className="text-[11px] text-muted-foreground font-medium">プランを調整する</p>
              <div className="grid grid-cols-2 gap-2">
                {REGEN_BUTTONS.map(({ mode, label, icon }) => (
                  <motion.button
                    key={mode}
                    onClick={() => generate(mode)}
                    disabled={isGenerating}
                    whileTap={{ scale: 0.96 }}
                    className={`flex items-center gap-2 px-3 py-3 rounded-2xl text-sm font-medium border transition-all ${
                      generatingMode === mode
                        ? "border-sage bg-sage/10 text-sage"
                        : "border-border bg-white text-charcoal"
                    } disabled:opacity-40`}
                  >
                    {generatingMode === mode ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-sage" />
                    ) : (
                      <span className="text-base leading-none">{icon}</span>
                    )}
                    <span className="text-[12px] leading-tight">{label}</span>
                  </motion.button>
                ))}
              </div>

              {/* 別案を出す */}
              <motion.button
                onClick={() => generate()}
                disabled={isGenerating}
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-border bg-white text-sm text-charcoal disabled:opacity-40"
              >
                <Zap className="w-4 h-4 text-sage" />
                別案を出す
              </motion.button>

              {/* Roleを変えてやり直す */}
              <button
                onClick={() => setPhase("select")}
                className="w-full py-3 rounded-2xl text-[12px] text-muted-foreground"
              >
                Roleを変えてやり直す
              </button>
            </motion.div>

            <div className="h-4" />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

// ─── AITaskCard ──────────────────────────────────────────────

function AITaskCard({
  task,
  roles,
  isExpanded,
  onToggleExpand,
  onToggleDone,
}: {
  task: GeneratedTodayTask;
  roles: Role[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleDone: () => void;
}) {
  const colors = ROLE_CATEGORY_COLORS[task.role_category];
  const isDone = task.status === "done";
  const role = roles.find((r) => r.id === task.role_id);

  return (
    <motion.div
      layout
      className={`bg-white rounded-3xl overflow-hidden shadow-sm transition-opacity ${isDone ? "opacity-55" : ""}`}
    >
      {/* ── メイン行 ── */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* チェックボタン */}
          <button onClick={onToggleDone} className="mt-0.5 shrink-0">
            {isDone
              ? <CheckCircle2 className="w-5 h-5 text-sage" />
              : <Circle className="w-5 h-5 text-muted-foreground" />
            }
          </button>

          {/* コンテンツ */}
          <div className="flex-1 min-w-0">
            {/* Role chip + 時間 + action size */}
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: colors.bg, color: colors.text }}
              >
                {ROLE_EMOJI[task.role_category]} {task.role_title}
              </span>
              {task.estimated_minutes && (
                <span className="text-[10px] text-muted-foreground">⏱ {task.estimated_minutes}分</span>
              )}
              {task.action_size && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-mist text-muted-foreground">
                  {ACTION_SIZE_LABELS[task.action_size]}
                </span>
              )}
              {task.ai_generated && (
                <Sparkles className="w-3 h-3 text-sage/60" />
              )}
            </div>

            {/* タスクタイトル */}
            <p className={`text-sm font-medium text-charcoal leading-snug ${isDone ? "line-through" : ""}`}>
              {task.title}
            </p>

            {/* 難易度ドット */}
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((d) => (
                <div
                  key={d}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: d <= task.difficulty ? colors.border : "#E8E6E0" }}
                />
              ))}
            </div>
          </div>

          {/* 展開ボタン */}
          <button onClick={onToggleExpand} className="p-1 shrink-0">
            {isExpanded
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
            }
          </button>
        </div>
      </div>

      {/* ── 展開パネル ── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div
              className="mx-4 mb-4 rounded-2xl p-4 space-y-3"
              style={{ backgroundColor: colors.bg + "30" }}
            >
              {/* Gap */}
              {(task.gap_target || task.gap_addressed) && (
                <DetailRow
                  label="埋めるGap"
                  value={task.gap_target || task.gap_addressed}
                  colors={colors}
                />
              )}

              {/* Dream connection */}
              {task.related_dream && (
                <DetailRow label="Dream" value={task.related_dream} colors={colors} />
              )}

              {/* 長期目標とのつながり */}
              {(task.related_long_term_goal || task.long_term_connection) && (
                <DetailRow
                  label="長期目標とのつながり"
                  value={task.related_long_term_goal || task.long_term_connection}
                  colors={colors}
                />
              )}

              {/* 今月の目標 */}
              {task.related_monthly_goal && (
                <DetailRow label="今月の目標との関連" value={task.related_monthly_goal} colors={colors} />
              )}

              {/* Current Reality */}
              {task.current_reality_reference && (
                <DetailRow label="現在地の参照" value={task.current_reality_reference} colors={colors} />
              )}

              {/* 今日やる理由 */}
              {task.today_reason && (
                <DetailRow label="今日やる理由" value={task.today_reason} colors={colors} />
              )}

              {/* 感情に合わせた調整 */}
              {task.emotional_adjustment_reason && (
                <DetailRow
                  label="感情に合わせた調整"
                  value={task.emotional_adjustment_reason}
                  colors={colors}
                />
              )}

              {/* カレンダー提案 */}
              {task.schedule_suggestion?.should_schedule && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px]" style={{ color: colors.text }}>
                    📅 {task.schedule_suggestion.suggested_time_label}に追加推奨
                    （{task.schedule_suggestion.suggested_duration_minutes}分）
                  </span>
                </div>
              )}

              {/* カレンダーに追加 */}
              <Link href={`/calendar?addTask=${task.id}`}>
                <div
                  className="flex items-center gap-1.5 text-[11px] mt-1 font-medium"
                  style={{ color: colors.text }}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  カレンダーに入れる
                </div>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { text: string; bg: string };
}) {
  return (
    <div>
      <p className="text-[10px] font-medium mb-0.5" style={{ color: colors.text }}>{label}</p>
      <p className="text-xs text-charcoal leading-relaxed">{value}</p>
    </div>
  );
}
