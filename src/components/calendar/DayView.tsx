"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { getEventsForDay, getRoleColor, getRoleTextColor } from "@/lib/calendar/calendarUtils";
import { CalendarEvent } from "@/types";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 64; // px per hour
const SNAP_MIN = 15;    // snap to 15 minutes

function snapMinutes(raw: number): number {
  return Math.max(Math.round(raw / SNAP_MIN) * SNAP_MIN, SNAP_MIN);
}

interface DragState {
  eventId: string;
  type: "resize" | "move";
  startClientY: number;
  initialHeightPx: number;
  initialTopPx: number;
  event: CalendarEvent;
}

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onAddSchedule: (hour?: number) => void;
  onEventResized?: (event: CalendarEvent, newEnd: Date) => Promise<void>;
  onEventMoved?: (event: CalendarEvent, newStart: Date, newEnd: Date) => Promise<void>;
  dailyLogMap?: Record<string, { mood_after: string | null }>;
}

export function DayView({
  currentDate, events, onSelectEvent, onAddSchedule,
  onEventResized, onEventMoved, dailyLogMap = {},
}: DayViewProps) {
  const dayEvents = getEventsForDay(events, currentDate);
  const allDayEvents = dayEvents.filter((e) => e.isAllDay);
  const timedEvents = dayEvents.filter((e) => !e.isAllDay);

  // Drag state kept in ref (no re-render during drag)
  const dragRef = useRef<DragState | null>(null);
  // Map of event DOM elements for direct manipulation
  const elMap = useRef<Map<string, HTMLDivElement>>(new Map());
  // Track tap vs drag
  const movedRef = useRef(false);
  // Saving flag
  const savingRef = useRef(false);

  function getEventStyle(event: CalendarEvent) {
    const start = new Date(event.start);
    const end = event.end ? new Date(event.end) : new Date(start.getTime() + 3600000);
    const topMin = start.getHours() * 60 + start.getMinutes();
    const heightMin = (end.getTime() - start.getTime()) / 60000;
    return {
      top: (topMin / 60) * HOUR_HEIGHT,
      height: Math.max((heightMin / 60) * HOUR_HEIGHT, 28),
    };
  }

  // Document-level touch/mouse move + end
  useEffect(() => {
    function onMove(e: TouchEvent | MouseEvent) {
      if (!dragRef.current) return;
      e.preventDefault();
      movedRef.current = true;

      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const dy = clientY - dragRef.current.startClientY;
      const el = elMap.current.get(dragRef.current.eventId);
      if (!el) return;

      if (dragRef.current.type === "resize") {
        const newH = Math.max(dragRef.current.initialHeightPx + dy, HOUR_HEIGHT / 4);
        el.style.height = `${newH}px`;
        // Update time label
        const label = el.querySelector("[data-time-label]");
        if (label) {
          const rawMin = (newH / HOUR_HEIGHT) * 60;
          const snapped = snapMinutes(rawMin);
          const newEnd = new Date(new Date(dragRef.current.event.start).getTime() + snapped * 60000);
          const startStr = new Date(dragRef.current.event.start).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
          const endStr = newEnd.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
          label.textContent = `${startStr} — ${endStr}`;
        }
      } else {
        const newTop = Math.max(0, Math.min(dragRef.current.initialTopPx + dy, 24 * HOUR_HEIGHT - HOUR_HEIGHT));
        el.style.top = `${newTop}px`;
        // Update time label
        const label = el.querySelector("[data-time-label]");
        if (label) {
          const rawMin = (newTop / HOUR_HEIGHT) * 60;
          const snapped = snapMinutes(rawMin);
          const baseDate = new Date(currentDate);
          baseDate.setHours(0, snapped, 0, 0);
          const origEnd = dragRef.current.event.end ? new Date(dragRef.current.event.end) : new Date(new Date(dragRef.current.event.start).getTime() + 3600000);
          const dur = origEnd.getTime() - new Date(dragRef.current.event.start).getTime();
          const newEnd = new Date(baseDate.getTime() + dur);
          const startStr = baseDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
          const endStr = newEnd.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
          label.textContent = `${startStr} — ${endStr}`;
        }
      }
    }

    async function onEnd() {
      if (!dragRef.current || savingRef.current) return;
      if (!movedRef.current) {
        // Was a tap, not a drag — fire select
        dragRef.current = null;
        return;
      }

      const drag = dragRef.current;
      dragRef.current = null;
      savingRef.current = true;

      const el = elMap.current.get(drag.eventId);

      if (drag.type === "resize" && onEventResized && el) {
        const finalH = parseFloat(el.style.height || "0");
        const rawMin = (finalH / HOUR_HEIGHT) * 60;
        const snapped = snapMinutes(rawMin);
        const newEnd = new Date(new Date(drag.event.start).getTime() + snapped * 60000);
        await onEventResized(drag.event, newEnd);
      } else if (drag.type === "move" && onEventMoved && el) {
        const finalTop = parseFloat(el.style.top || "0");
        const rawMin = (finalTop / HOUR_HEIGHT) * 60;
        const snapped = snapMinutes(rawMin);
        const base = new Date(currentDate);
        base.setHours(0, snapped, 0, 0);
        const origEnd = drag.event.end ? new Date(drag.event.end) : new Date(new Date(drag.event.start).getTime() + 3600000);
        const dur = origEnd.getTime() - new Date(drag.event.start).getTime();
        const newEnd = new Date(base.getTime() + dur);
        await onEventMoved(drag.event, base, newEnd);
      }

      savingRef.current = false;
    }

    document.addEventListener("touchmove", onMove, { passive: false });
    document.addEventListener("touchend", onEnd);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onEnd);

    return () => {
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onEnd);
    };
  }, [currentDate, onEventResized, onEventMoved]);

  function startResize(e: React.TouchEvent | React.MouseEvent, event: CalendarEvent) {
    e.stopPropagation();
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const end = event.end ? new Date(event.end) : new Date(new Date(event.start).getTime() + 3600000);
    const heightMin = (end.getTime() - new Date(event.start).getTime()) / 60000;
    const initialH = Math.max((heightMin / 60) * HOUR_HEIGHT, 28);
    movedRef.current = false;
    dragRef.current = {
      eventId: event.id, type: "resize",
      startClientY: clientY, initialHeightPx: initialH, initialTopPx: 0, event,
    };
  }

  function startMove(e: React.TouchEvent | React.MouseEvent, event: CalendarEvent) {
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const start = new Date(event.start);
    const topMin = start.getHours() * 60 + start.getMinutes();
    const initialTop = (topMin / 60) * HOUR_HEIGHT;
    movedRef.current = false;
    dragRef.current = {
      eventId: event.id, type: "move",
      startClientY: clientY, initialHeightPx: 0, initialTopPx: initialTop, event,
    };
  }

  const dateStr = format(currentDate, "yyyy-MM-dd");
  const logEntry = dailyLogMap[dateStr];

  return (
    <div className="space-y-3">
      {/* 1mm日記リンク */}
      <Link
        href={`/daily-log/${dateStr}`}
        className="flex items-center justify-between bg-white rounded-2xl px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{logEntry?.mood_after ? { great: "🌟", good: "😊", okay: "😐", tired: "😴", rough: "😔" }[logEntry.mood_after] ?? "📖" : "📖"}</span>
          <span className="text-sm text-charcoal">1mm日記</span>
          {logEntry && <span className="text-[10px] text-sage bg-sage/10 px-2 py-0.5 rounded-full">記録済み</span>}
        </div>
        <span className="text-xs text-muted-foreground">{logEntry ? "編集 →" : "記録する →"}</span>
      </Link>

      {/* 終日イベント */}
      {allDayEvents.length > 0 && (
        <div className="bg-white rounded-2xl p-3 space-y-2">
          <p className="text-xs text-muted-foreground">終日</p>
          {allDayEvents.map((e) => {
            const bg = getRoleColor(e.roleCategory, e.color);
            const textColor = getRoleTextColor(e.roleCategory);
            return (
              <button
                key={e.id}
                onClick={() => onSelectEvent(e)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left"
                style={{ backgroundColor: bg + "50" }}
              >
                <p className="text-xs font-medium" style={{ color: textColor }}>{e.title}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* タイムライン */}
      <div className="bg-white rounded-3xl overflow-hidden">
        <div className="overflow-y-auto max-h-[60vh] scrollbar-hide">
          <div className="relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
            {/* 時間グリッド */}
            {HOURS.map((h) => (
              <button
                key={h}
                onClick={() => !dragRef.current && onAddSchedule(h)}
                className="absolute left-0 right-0 border-t border-mist/40 flex items-start group"
                style={{ top: `${h * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
              >
                <span className="text-[10px] text-muted-foreground w-10 text-right pr-2 -translate-y-2 shrink-0">
                  {h === 0 ? "" : `${h}:00`}
                </span>
                <div className="flex-1 h-full group-hover:bg-sage/5 transition-colors" />
              </button>
            ))}

            {/* イベント */}
            {timedEvents.map((e) => {
              const { top, height } = getEventStyle(e);
              const bg = getRoleColor(e.roleCategory, e.color);
              const textColor = getRoleTextColor(e.roleCategory);
              const startStr = new Date(e.start).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
              const endStr = e.end
                ? new Date(e.end).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
                : "";

              return (
                <div
                  key={e.id}
                  ref={(node) => {
                    if (node) elMap.current.set(e.id, node);
                    else elMap.current.delete(e.id);
                  }}
                  className="absolute left-12 right-2 rounded-xl overflow-visible shadow-sm z-10 touch-none"
                  style={{ top: `${top}px`, height: `${height}px`, backgroundColor: bg + "90" }}
                >
                  {/* 本体：タップ or ドラッグで移動 */}
                  <div
                    className="px-2.5 pt-1.5 pb-5 h-full cursor-grab active:cursor-grabbing select-none"
                    onTouchStart={(ev) => startMove(ev, e)}
                    onMouseDown={(ev) => startMove(ev, e)}
                    onClick={() => {
                      if (!movedRef.current) onSelectEvent(e);
                    }}
                  >
                    <p className="text-xs font-medium truncate" style={{ color: textColor }}>
                      {e.title}
                    </p>
                    <p
                      data-time-label
                      className="text-[10px] mt-0.5"
                      style={{ color: textColor + "99" }}
                    >
                      {startStr}{endStr && ` — ${endStr}`}
                    </p>
                  </div>

                  {/* リサイズハンドル（下端） */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-5 flex items-center justify-center cursor-s-resize select-none touch-none z-20"
                    onTouchStart={(ev) => { ev.stopPropagation(); startResize(ev, e); }}
                    onMouseDown={(ev) => { ev.stopPropagation(); startResize(ev, e); }}
                  >
                    <div
                      className="w-8 h-1 rounded-full opacity-60"
                      style={{ backgroundColor: textColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
