"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Target } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import { RoleTimeInsight } from "@/components/calendar/RoleTimeInsight";
import { ScheduleFormModal } from "@/components/calendar/ScheduleFormModal";
import { ScheduleEditModal } from "@/components/calendar/ScheduleEditModal";
import { CalendarEventChip } from "@/components/calendar/CalendarEventChip";
import {
  CalendarViewMode, CalendarEvent, Schedule, Task, ProjectTask, DailyLog, MoodType,
  Role, UserProfile, PetType, ROLE_CATEGORY_COLORS, GoalTask,
  Goal, GOAL_CATEGORY_CONFIG, GoalCategory,
} from "@/types";
import { navigateDate, getViewLabel, getEventsForDay } from "@/lib/calendar/calendarUtils";

function CalendarContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [filteredRoleIds, setFilteredRoleIds] = useState<string[]>([]);
  const [dailyLogMap, setDailyLogMap] = useState<Record<string, { mood_after: MoodType | null }>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDefaultHour, setModalDefaultHour] = useState<number | undefined>(undefined);
  const [modalDefaultDate, setModalDefaultDate] = useState<Date>(new Date());
  const [linkedTask, setLinkedTask] = useState<{ id: string; title: string } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [goals, setGoals] = useState<(Goal & { taskCount: number; completedCount: number })[]>([]);

  useEffect(() => {
    loadData();
    loadGoals();

    // TODOからカレンダー追加のクエリパラメータ
    const taskId = searchParams.get("addTask");
    if (taskId) {
      loadTaskForModal(taskId);
    }
  }, []);

  async function loadGoals() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: gs } = await supabase
      .from("goals")
      .select("*, goal_tasks(id, is_completed)")
      .eq("user_id", user.id)
      .eq("is_completed", false)
      .order("event_date", { ascending: true })
      .limit(5);
    setGoals(
      (gs || []).map((g: any) => ({
        ...g,
        taskCount: (g.goal_tasks || []).length,
        completedCount: (g.goal_tasks || []).filter((t: any) => t.is_completed).length,
      }))
    );
  }

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: r }, { data: s }, { data: t }, { data: p }, { data: pt }, { data: logs }, { data: gt }] = await Promise.all([
      supabase.from("roles").select("*").eq("user_id", user.id),
      supabase.from("schedules").select("*").eq("user_id", user.id),
      supabase.from("tasks").select("*, roles(category)").eq("user_id", user.id)
        .not("scheduled_at", "is", null),
      supabase.from("users_profile").select("*").eq("user_id", user.id).single(),
      supabase.from("project_tasks").select("*").eq("user_id", user.id).not("due_date", "is", null),
      supabase.from("daily_logs").select("date, mood_after").eq("user_id", user.id),
      supabase.from("goal_tasks").select("*").eq("user_id", user.id).not("due_date", "is", null),
    ]);

    setRoles(r || []);
    setProfile(p);

    const roleMap = new Map<string, Role>((r || []).map((role: Role) => [role.id, role]));

    // Scheduleをイベント化
    const scheduleEvents: CalendarEvent[] = (s || []).map((sc: Schedule) => {
      const role = sc.role_id ? roleMap.get(sc.role_id) : undefined;
      return {
        id: sc.id,
        type: "schedule",
        title: sc.title,
        start: new Date(sc.start_time),
        end: sc.end_time ? new Date(sc.end_time) : undefined,
        isAllDay: sc.is_all_day,
        roleId: sc.role_id || undefined,
        roleCategory: role?.category,
        color: sc.color || undefined,
        sourceData: sc,
      };
    });

    // タスクをイベント化（scheduled_atがあるもの）
    const taskEvents: CalendarEvent[] = (t || []).map((task: any) => {
      const role = task.role_id ? roleMap.get(task.role_id) : undefined;
      return {
        id: `task-${task.id}`,
        type: "task",
        title: task.title,
        start: new Date(task.scheduled_at),
        end: task.estimated_minutes
          ? new Date(new Date(task.scheduled_at).getTime() + task.estimated_minutes * 60000)
          : undefined,
        isAllDay: false,
        roleId: task.role_id || undefined,
        roleCategory: role?.category,
        sourceData: task as Task,
      };
    });

    const projectTaskEvents: CalendarEvent[] = (pt || []).map((item: ProjectTask) => {
      const role = item.role_id ? roleMap.get(item.role_id) : undefined;
      return {
        id: `project-task-${item.id}`,
        type: "project_task" as const,
        title: item.title,
        start: new Date(item.due_date + "T00:00:00"),
        isAllDay: true,
        roleId: item.role_id || undefined,
        roleCategory: role?.category,
        color: "#F5CCC8",
        sourceData: item,
      };
    });

    const goalTaskEvents: CalendarEvent[] = (gt || []).map((item: GoalTask) => ({
      id: `goal-task-${item.id}`,
      type: "goal_task" as const,
      title: item.title,
      start: new Date(item.due_date + "T00:00:00"),
      isAllDay: true,
      color: "#FBE4B0",
      sourceData: item,
    }));

    setEvents([...scheduleEvents, ...taskEvents, ...projectTaskEvents, ...goalTaskEvents]);

    const logMap: Record<string, { mood_after: MoodType | null }> = {};
    (logs || []).forEach((lg: { date: string; mood_after: MoodType | null }) => { logMap[lg.date] = { mood_after: lg.mood_after }; });
    setDailyLogMap(logMap);
  }

  async function loadTaskForModal(taskId: string) {
    const { data: t } = await supabase.from("tasks").select("id, title").eq("id", taskId).single();
    if (t) {
      setLinkedTask({ id: t.id, title: t.title });
      setIsModalOpen(true);
    }
  }

  // フィルタリング
  const filteredEvents = filteredRoleIds.length === 0
    ? events
    : events.filter((e) => !e.roleId || filteredRoleIds.includes(e.roleId));

  const viewLabel = getViewLabel(currentDate, viewMode);

  function handlePrev() {
    setCurrentDate((d) => navigateDate(d, "prev", viewMode));
  }

  function handleNext() {
    setCurrentDate((d) => navigateDate(d, "next", viewMode));
  }

  async function handleEventResized(event: CalendarEvent, newEnd: Date) {
    if (event.type === "task") {
      const taskId = event.id.replace("task-", "");
      const dur = Math.round((newEnd.getTime() - new Date(event.start).getTime()) / 60000);
      await supabase.from("tasks").update({ estimated_minutes: dur }).eq("id", taskId);
    } else {
      await supabase.from("schedules").update({ end_time: newEnd.toISOString() }).eq("id", event.id);
    }
    await loadData();
  }

  async function handleEventMoved(event: CalendarEvent, newStart: Date, newEnd: Date) {
    if (event.type === "task") {
      const taskId = event.id.replace("task-", "");
      await supabase.from("tasks").update({ scheduled_at: newStart.toISOString() }).eq("id", taskId);
    } else {
      await supabase.from("schedules").update({
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
      }).eq("id", event.id);
    }
    await loadData();
  }

  function handleAddSchedule(date?: Date, hour?: number) {
    setModalDefaultDate(date ?? selectedDate);
    setModalDefaultHour(hour);
    setLinkedTask(null);
    setIsModalOpen(true);
  }

  const selectedDayEvents = getEventsForDay(filteredEvents, selectedDate);

  return (
    <div className="px-5 pt-safe pt-6 space-y-4 pb-4">
      {/* ヘッダー */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <button onClick={handlePrev} className="w-8 h-8 rounded-xl bg-white flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 text-charcoal" />
          </button>
          <h2 className="font-medium text-charcoal text-base min-w-[120px] text-center">{viewLabel}</h2>
          <button onClick={handleNext} className="w-8 h-8 rounded-xl bg-white flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-charcoal" />
          </button>
        </div>
        <button
          onClick={() => handleAddSchedule()}
          className="w-9 h-9 rounded-2xl bg-sage flex items-center justify-center"
        >
          <Plus className="w-4 h-4 text-white" />
        </button>
      </motion.div>

      {/* ビュー切替 */}
      <div className="flex bg-white rounded-2xl p-1">
        {(["month", "week", "day", "today"] as CalendarViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => {
              setViewMode(v);
              if (v === "today") setCurrentDate(new Date());
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
              viewMode === v ? "bg-sage text-white" : "text-muted-foreground"
            }`}
          >
            {v === "month" ? "月" : v === "week" ? "週" : v === "day" ? "日" : "今日"}
          </button>
        ))}
      </div>

      {/* Roleフィルター */}
      {roles.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {roles.map((role) => {
            const colors = ROLE_CATEGORY_COLORS[role.category];
            const isActive = filteredRoleIds.includes(role.id);
            return (
              <button
                key={role.id}
                onClick={() => {
                  setFilteredRoleIds((ids) =>
                    isActive ? ids.filter((id) => id !== role.id) : [...ids, role.id]
                  );
                }}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor: isActive ? colors.bg : "#F0EEE9",
                  color: isActive ? colors.text : "#888680",
                }}
              >
                {role.title}
              </button>
            );
          })}
        </div>
      )}

      {/* カレンダービュー */}
      <AnimatePresence mode="wait">
        {viewMode === "month" && (
          <motion.div key="month" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MonthView
              currentDate={currentDate}
              events={filteredEvents}
              selectedDate={selectedDate}
              dailyLogMap={dailyLogMap}
              onSelectDate={(d) => { setSelectedDate(d); setViewMode("day"); setCurrentDate(d); }}
              onSelectEvent={setSelectedEvent}
              onEventMoved={handleEventMoved}
            />
            {/* 選択日のイベント */}
            {selectedDayEvents.length > 0 && (
              <div className="mt-3 bg-white rounded-2xl p-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  {format(selectedDate, "M月d日（E）", { locale: ja })}
                </p>
                {selectedDayEvents.map((e) => (
                  <CalendarEventChip key={e.id} event={e} onSelectEvent={setSelectedEvent} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {viewMode === "week" && (
          <motion.div key="week" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <WeekView
              currentDate={currentDate}
              events={filteredEvents}
              onSelectEvent={setSelectedEvent}
              onAddSchedule={(date, hour) => handleAddSchedule(date, hour)}
              onEventResized={handleEventResized}
              onEventMoved={handleEventMoved}
            />
          </motion.div>
        )}

        {(viewMode === "day" || viewMode === "today") && (
          <motion.div key="day" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DayView
              currentDate={viewMode === "today" ? new Date() : currentDate}
              events={filteredEvents}
              onSelectEvent={setSelectedEvent}
              onAddSchedule={(hour) => handleAddSchedule(viewMode === "today" ? new Date() : currentDate, hour)}
              onEventResized={handleEventResized}
              onEventMoved={handleEventMoved}
              dailyLogMap={dailyLogMap}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role時間インサイト（月・週ビュー） */}
      {(viewMode === "month" || viewMode === "week") && (
        <RoleTimeInsight
          events={filteredEvents}
          currentDate={currentDate}
          petType={(profile?.selected_pet || "cat") as PetType}
        />
      )}

      {/* スケジュール追加モーダル */}
      <ScheduleFormModal
        key={`${modalDefaultDate.toDateString()}-${modalDefaultHour}`}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setLinkedTask(null); }}
        onSaved={() => { loadData(); }}
        roles={roles}
        defaultDate={modalDefaultDate}
        defaultHour={modalDefaultHour}
        linkedTaskId={linkedTask?.id}
        linkedTaskTitle={linkedTask?.title}
      />

      {/* イベント編集モーダル */}
      <ScheduleEditModal
        key={selectedEvent?.id}
        event={selectedEvent}
        roles={roles}
        onClose={() => setSelectedEvent(null)}
        onSaved={() => { loadData(); setSelectedEvent(null); }}
        onDeleted={() => { loadData(); setSelectedEvent(null); }}
      />

      {/* 🎯 ゴール */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Target className="w-4 h-4 text-sage" />
            <p className="text-sm font-medium text-charcoal">ゴール</p>
          </div>
          <Link href="/goals" className="text-xs text-sage font-medium flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            追加・一覧
          </Link>
        </div>

        {goals.length === 0 ? (
          <Link href="/goals">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3">
              <span className="text-xl">🎯</span>
              <p className="text-sm text-muted-foreground flex-1">ゴールを追加して逆算タスクを作ろう</p>
              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
            </div>
          </Link>
        ) : (
          <div className="space-y-2">
            {goals.map((g) => {
              const config = GOAL_CATEGORY_CONFIG[g.category as GoalCategory] ?? GOAL_CATEGORY_CONFIG.other;
              const progress = g.taskCount > 0 ? Math.round((g.completedCount / g.taskCount) * 100) : 0;
              const eventDate = new Date(g.event_date + "T00:00:00");
              const daysLeft = Math.ceil((eventDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
              return (
                <Link key={g.id} href={`/goals/${g.id}`}>
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-center gap-3 active:scale-[0.98] transition-transform">
                    <span className="text-lg shrink-0">{config.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-charcoal truncate">{g.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 rounded-full bg-mist overflow-hidden">
                          <div className="h-full rounded-full bg-sage" style={{ width: `${progress}%` }} />
                        </div>
                        <span className={`text-[10px] font-medium shrink-0 ${daysLeft <= 7 ? "text-red-500" : "text-muted-foreground"}`}>
                          あと{daysLeft}日
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="h-4" />
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 rounded-full border-2 border-sage border-t-transparent animate-spin" /></div>}>
      <CalendarContent />
    </Suspense>
  );
}
