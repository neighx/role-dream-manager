"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { DailyLog, Role, Task, Schedule, PetType, ROLE_CATEGORY_COLORS } from "@/types";
import { DailyLogForm, MOOD_EMOJI } from "@/components/daily-log/DailyLogForm";

const ROLE_EMOJI: Record<string, string> = {
  creator: "🎵", health: "🌿", work: "💼",
  relationship: "💛", learning: "🌍", selfcare: "🕯",
};

export default function DailyLogPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [log, setLog] = useState<DailyLog | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [petType, setPetType] = useState<PetType>("cat");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const displayDate = (() => {
    try { return format(new Date(date + "T00:00:00"), "M月d日（E）", { locale: ja }); }
    catch { return date; }
  })();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: p }, { data: r }, { data: lg }, { data: t }, { data: s }] = await Promise.all([
        supabase.from("users_profile").select("selected_pet").eq("user_id", user.id).single(),
        supabase.from("roles").select("*").eq("user_id", user.id).order("display_order"),
        supabase.from("daily_logs").select("*").eq("user_id", user.id).eq("date", date).maybeSingle(),
        supabase.from("tasks").select("*").eq("user_id", user.id).eq("due_date", date).order("quadrant"),
        supabase.from("schedules").select("*").eq("user_id", user.id)
          .gte("start_time", `${date}T00:00:00`)
          .lte("start_time", `${date}T23:59:59`)
          .order("start_time"),
      ]);

      setPetType((p?.selected_pet || "cat") as PetType);
      setRoles((r || []) as Role[]);
      setLog(lg as DailyLog | null);
      setTasks((t || []) as Task[]);
      setSchedules((s || []) as Schedule[]);
      setIsLoading(false);
    }
    load();
  }, [date]);

  function getRoleForId(roleId: string | null) {
    return roles.find((r) => r.id === roleId) || null;
  }

  const doneTasks = tasks.filter((t) => t.status === "done");
  const undoneTasks = tasks.filter((t) => t.status !== "done");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-sage border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-safe pt-6 pb-10 space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-xl bg-mist flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-charcoal" />
        </button>
        <div>
          <p className="text-[11px] text-muted-foreground">1mm日記</p>
          <h1 className="font-medium text-charcoal text-base">{displayDate}</h1>
        </div>
        {log?.mood_after && (
          <span className="ml-auto text-2xl">{MOOD_EMOJI[log.mood_after]}</span>
        )}
      </div>

      {/* その日の予定 */}
      {schedules.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-[12px] font-medium text-charcoal mb-2">📅 この日の予定</h2>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {schedules.map((s, i) => {
              const role = getRoleForId(s.role_id);
              const colors = role ? ROLE_CATEGORY_COLORS[role.category] : null;
              return (
                <div key={s.id} className={`px-4 py-2.5 flex items-center gap-3 ${i < schedules.length - 1 ? "border-b border-mist" : ""}`}>
                  {colors && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colors.border }} />}
                  <span className="text-sm text-charcoal flex-1 truncate">{s.title}</span>
                  {!s.is_all_day && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(s.start_time).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* TODOサマリー */}
      {tasks.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <h2 className="text-[12px] font-medium text-charcoal mb-2">✅ この日のTODO</h2>
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {tasks.map((t, i) => {
              const role = getRoleForId(t.role_id);
              const isDone = t.status === "done";
              return (
                <div key={t.id} className={`px-4 py-2.5 flex items-center gap-3 ${i < tasks.length - 1 ? "border-b border-mist" : ""}`}>
                  {isDone
                    ? <CheckCircle2 className="w-4 h-4 text-sage shrink-0" />
                    : <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
                  <span className={`text-sm flex-1 truncate ${isDone ? "line-through text-muted-foreground/60" : "text-charcoal"}`}>
                    {t.title}
                  </span>
                  {role && (
                    <span className="text-[9px] text-muted-foreground shrink-0">
                      {ROLE_EMOJI[role.category]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {doneTasks.length > 0 && (
            <p className="text-[10px] text-center text-muted-foreground mt-1.5">
              {doneTasks.length}/{tasks.length}件完了
            </p>
          )}
        </motion.div>
      )}

      {/* 既存ログのサマリー（記録済みの場合） */}
      {log && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <h2 className="text-[12px] font-medium text-charcoal mb-2">📝 記録のサマリー</h2>
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
            {log.one_line_diary && (
              <p className="text-sm text-charcoal">&ldquo;{log.one_line_diary}&rdquo;</p>
            )}
            <div className="flex flex-wrap gap-2">
              {log.english_minutes > 0 && (
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">🌍 英語 {log.english_minutes}分</span>
              )}
              {log.exercise_minutes > 0 && (
                <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full">🌿 運動 {log.exercise_minutes}分</span>
              )}
              {log.creator_minutes > 0 && (
                <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">🎵 制作 {log.creator_minutes}分</span>
              )}
              {log.work_minutes > 0 && (
                <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">💼 仕事 {log.work_minutes}分</span>
              )}
              {log.study_minutes > 0 && (
                <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">📚 勉強 {log.study_minutes}分</span>
              )}
              {log.weather && (
                <span className="text-[10px] bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full">
                  {log.weather}{log.temperature != null ? ` ${log.temperature}℃` : ""}
                </span>
              )}
            </div>
            {(log.roles_grown?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1">
                {log.roles_grown!.map((rId) => {
                  const role = getRoleForId(rId);
                  if (!role) return null;
                  const colors = ROLE_CATEGORY_COLORS[role.category];
                  return (
                    <span key={rId} className="text-[9px] px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: colors.bg, color: colors.text }}>
                      {ROLE_EMOJI[role.category]} {role.title}
                    </span>
                  );
                })}
              </div>
            )}
            {log.photo_url && (
              <img src={log.photo_url} alt="今日の写真" className="w-full rounded-xl object-cover max-h-48 mt-1" />
            )}
          </div>
        </motion.div>
      )}

      {/* 記録フォーム */}
      <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h2 className="text-[12px] font-medium text-charcoal mb-3">
          {log ? "✏️ 記録を編集" : "✏️ 今日を記録する"}
        </h2>
        <DailyLogForm
          date={date}
          initialLog={log}
          roles={roles}
          petType={petType}
          onSaved={(saved) => setLog(saved)}
        />
      </motion.div>
    </div>
  );
}
