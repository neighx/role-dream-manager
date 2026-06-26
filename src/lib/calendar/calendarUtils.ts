import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameDay, isSameMonth,
  addMonths, subMonths, addWeeks, subWeeks,
  startOfDay, endOfDay, addDays,
} from "date-fns";
import { ja } from "date-fns/locale";
import { RoleCategory, ROLE_CATEGORY_COLORS, CalendarEvent } from "@/types";

// ── カレンダーグリッド生成 ────────────────────────────────────

export function getMonthGrid(date: Date): Date[][] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export function getWeekDays(date: Date): Date[] {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 });
  return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
}

export function getHourSlots(): number[] {
  return Array.from({ length: 24 }, (_, i) => i);
}

// ── ナビゲーション ────────────────────────────────────────────

export function navigateDate(
  date: Date,
  direction: "prev" | "next",
  view: "month" | "week" | "day" | "today"
): Date {
  if (view === "month") return direction === "next" ? addMonths(date, 1) : subMonths(date, 1);
  if (view === "week") return direction === "next" ? addWeeks(date, 1) : subWeeks(date, 1);
  if (view === "day") return direction === "next" ? addDays(date, 1) : addDays(date, -1);
  return new Date();
}

// ── ラベル生成 ────────────────────────────────────────────────

export function getViewLabel(date: Date, view: "month" | "week" | "day" | "today"): string {
  if (view === "month") return format(date, "yyyy年M月", { locale: ja });
  if (view === "week") {
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(date, { weekStartsOn: 0 });
    return `${format(weekStart, "M/d")} — ${format(weekEnd, "M/d")}`;
  }
  if (view === "day") return format(date, "M月d日（E）", { locale: ja });
  return format(new Date(), "M月d日（E）今日", { locale: ja });
}

// ── イベントフィルタリング ────────────────────────────────────

export function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((e) => isSameDay(new Date(e.start), day));
}

export function getEventsForWeek(events: CalendarEvent[], weekStart: Date): CalendarEvent[] {
  const weekEnd = addDays(weekStart, 7);
  return events.filter((e) => {
    const d = new Date(e.start);
    return d >= weekStart && d < weekEnd;
  });
}

// ── Roleカラー取得 ────────────────────────────────────────────

export function getRoleColor(category?: RoleCategory, overrideColor?: string | null): string {
  if (overrideColor) return overrideColor;
  if (category) return ROLE_CATEGORY_COLORS[category].bg;
  return "#E8E6E0";
}

export function getRoleTextColor(category?: RoleCategory): string {
  if (category) return ROLE_CATEGORY_COLORS[category].text;
  return "#555553";
}

// ── 週インサイト計算 ──────────────────────────────────────────

export interface RoleTimeInsight {
  category: RoleCategory;
  label: string;
  totalMinutes: number;
  color: string;
}

export function calcWeekInsights(
  events: CalendarEvent[],
  weekStart: Date
): RoleTimeInsight[] {
  const weekEnd = addDays(weekStart, 7);
  const weekEvents = events.filter((e) => {
    const d = new Date(e.start);
    return d >= weekStart && d < weekEnd && e.roleCategory;
  });

  const byCategory: Partial<Record<RoleCategory, number>> = {};
  for (const e of weekEvents) {
    if (!e.roleCategory) continue;
    const start = new Date(e.start).getTime();
    const end = e.end ? new Date(e.end).getTime() : start + 30 * 60 * 1000;
    const minutes = Math.round((end - start) / 60000);
    byCategory[e.roleCategory] = (byCategory[e.roleCategory] || 0) + minutes;
  }

  return (Object.entries(byCategory) as [RoleCategory, number][])
    .map(([cat, mins]) => ({
      category: cat,
      label: ROLE_CATEGORY_COLORS[cat].label,
      totalMinutes: mins,
      color: ROLE_CATEGORY_COLORS[cat].bg,
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}
