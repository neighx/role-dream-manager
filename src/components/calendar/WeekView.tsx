"use client";

import { useRef, useEffect } from "react";
import { format, isToday } from "date-fns";
import { ja } from "date-fns/locale";
import { getWeekDays, getEventsForDay, getRoleColor, getRoleTextColor } from "@/lib/calendar/calendarUtils";
import { CalendarEvent } from "@/types";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60;
const SNAP_MIN = 15;

function snapMinutes(raw: number): number {
  return Math.max(Math.round(raw / SNAP_MIN) * SNAP_MIN, SNAP_MIN);
}

interface DragState {
  eventId: string;
  type: "resize" | "move";
  startClientX: number;
  startClientY: number;
  initialHeightPx: number;
  initialTopPx: number;
  originalDayIndex: number;
  event: CalendarEvent;
}

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onAddSchedule?: (date: Date, hour: number) => void;
  onEventResized?: (event: CalendarEvent, newEnd: Date) => Promise<void>;
  onEventMoved?: (event: CalendarEvent, newStart: Date, newEnd: Date) => Promise<void>;
}

export function WeekView({
  currentDate, events, onSelectEvent, onAddSchedule,
  onEventResized, onEventMoved,
}: WeekViewProps) {
  const weekDays = getWeekDays(currentDate);

  const dragRef = useRef<DragState | null>(null);
  const elMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const movedRef = useRef(false);
  const savingRef = useRef(false);
  const targetDayRef = useRef<number>(-1);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // Highlight overlay for target column
  const highlightRef = useRef<Array<HTMLDivElement | null>>([]);

  function getEventTop(event: CalendarEvent) {
    const start = new Date(event.start);
    const topMin = start.getHours() * 60 + start.getMinutes();
    return (topMin / 60) * HOUR_HEIGHT;
  }

  function getEventHeight(event: CalendarEvent) {
    const start = new Date(event.start);
    const end = event.end ? new Date(event.end) : new Date(start.getTime() + 3600000);
    const heightMin = (end.getTime() - start.getTime()) / 60000;
    return Math.max((heightMin / 60) * HOUR_HEIGHT, 20);
  }

  function getTargetDayIndex(clientX: number): number {
    if (!gridRef.current) return -1;
    const rect = gridRef.current.getBoundingClientRect();
    const colW = rect.width / 8; // 8 columns (1 time + 7 days)
    const colIndex = Math.floor((clientX - rect.left) / colW) - 1; // -1 for time axis
    return Math.max(0, Math.min(6, colIndex));
  }

  function getSnappedMinutes(clientY: number): number {
    if (!scrollRef.current) return 0;
    const rect = scrollRef.current.getBoundingClientRect();
    const relY = clientY - rect.top + scrollRef.current.scrollTop;
    return snapMinutes((relY / HOUR_HEIGHT) * 60);
  }

  function setColumnHighlight(index: number) {
    highlightRef.current.forEach((el, i) => {
      if (!el) return;
      el.style.backgroundColor = i === index ? "rgba(139,168,138,0.12)" : "";
    });
  }

  useEffect(() => {
    function onMove(e: TouchEvent | MouseEvent) {
      if (!dragRef.current) return;
      e.preventDefault();
      movedRef.current = true;

      const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const el = elMap.current.get(dragRef.current.eventId);
      if (!el) return;

      if (dragRef.current.type === "resize") {
        const dy = clientY - dragRef.current.startClientY;
        const newH = Math.max(dragRef.current.initialHeightPx + dy, HOUR_HEIGHT / 4);
        el.style.height = `${newH}px`;
        const label = el.querySelector("[data-time-label]");
        if (label) {
          const snapped = snapMinutes((newH / HOUR_HEIGHT) * 60);
          const newEnd = new Date(new Date(dragRef.current.event.start).getTime() + snapped * 60000);
          label.textContent = `${format(new Date(dragRef.current.event.start), "HH:mm")}–${format(newEnd, "HH:mm")}`;
        }
      } else {
        // 縦: 時間移動
        const dy = clientY - dragRef.current.startClientY;
        const newTop = Math.max(0, Math.min(dragRef.current.initialTopPx + dy, 24 * HOUR_HEIGHT - 20));
        el.style.top = `${newTop}px`;

        // 横: 日付移動（translateX）
        const dx = clientX - dragRef.current.startClientX;
        el.style.transform = `translateX(${dx}px)`;
        el.style.zIndex = "50";
        el.style.opacity = "0.88";
        el.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";

        // ターゲット列をハイライト
        const targetIdx = getTargetDayIndex(clientX);
        targetDayRef.current = targetIdx;
        setColumnHighlight(targetIdx);

        // 時刻ラベル更新
        const label = el.querySelector("[data-time-label]");
        if (label) {
          const snappedMin = snapMinutes((newTop / HOUR_HEIGHT) * 60);
          const h = Math.floor(snappedMin / 60);
          const m = snappedMin % 60;
          const dur = dragRef.current.event.end
            ? new Date(dragRef.current.event.end).getTime() - new Date(dragRef.current.event.start).getTime()
            : 3600000;
          const endMin = snappedMin + dur / 60000;
          const eh = Math.floor(endMin / 60); const em = endMin % 60;
          const targetDay = weekDays[targetIdx];
          const dayStr = targetDay ? format(targetDay, "M/d") : "";
          label.textContent = `${dayStr} ${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}–${String(eh).padStart(2,"0")}:${String(em).padStart(2,"0")}`;
        }
      }
    }

    async function onEnd() {
      if (!dragRef.current || savingRef.current) return;

      // ハイライトを消す
      setColumnHighlight(-1);

      if (!movedRef.current) {
        dragRef.current = null;
        return;
      }

      const drag = dragRef.current;
      dragRef.current = null;
      savingRef.current = true;

      const el = elMap.current.get(drag.eventId);
      if (el) {
        el.style.transform = "";
        el.style.zIndex = "";
        el.style.opacity = "";
        el.style.boxShadow = "";
      }

      if (drag.type === "resize" && onEventResized && el) {
        const finalH = parseFloat(el.style.height || "0");
        const snapped = snapMinutes((finalH / HOUR_HEIGHT) * 60);
        const newEnd = new Date(new Date(drag.event.start).getTime() + snapped * 60000);
        await onEventResized(drag.event, newEnd);
      } else if (drag.type === "move" && onEventMoved && el) {
        const finalTop = parseFloat(el.style.top || "0");
        const snappedMin = snapMinutes((finalTop / HOUR_HEIGHT) * 60);
        const dayIdx = targetDayRef.current >= 0 ? targetDayRef.current : drag.originalDayIndex;
        const targetDay = weekDays[dayIdx] ?? weekDays[drag.originalDayIndex];
        const base = new Date(targetDay);
        base.setHours(0, snappedMin, 0, 0);
        const dur = drag.event.end
          ? new Date(drag.event.end).getTime() - new Date(drag.event.start).getTime()
          : 3600000;
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
  }, [weekDays, onEventResized, onEventMoved]);

  function startResize(e: React.TouchEvent | React.MouseEvent, event: CalendarEvent, dayIdx: number) {
    e.stopPropagation();
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    movedRef.current = false;
    dragRef.current = {
      eventId: event.id, type: "resize",
      startClientX: 0, startClientY: clientY,
      initialHeightPx: getEventHeight(event), initialTopPx: 0,
      originalDayIndex: dayIdx, event,
    };
  }

  function startMove(e: React.TouchEvent | React.MouseEvent, event: CalendarEvent, dayIdx: number) {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    movedRef.current = false;
    targetDayRef.current = dayIdx;
    dragRef.current = {
      eventId: event.id, type: "move",
      startClientX: clientX, startClientY: clientY,
      initialHeightPx: 0, initialTopPx: getEventTop(event),
      originalDayIndex: dayIdx, event,
    };
  }

  return (
    <div className="bg-white rounded-3xl overflow-hidden">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-8 border-b border-mist sticky top-0 bg-white z-10">
        <div className="py-3" />
        {weekDays.map((day, i) => (
          <div key={i} className="py-3 text-center">
            <p className={`text-[10px] ${i === 0 ? "text-rose-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"}`}>
              {format(day, "E", { locale: ja })}
            </p>
            <div className={`w-7 h-7 mx-auto mt-1 flex items-center justify-center rounded-full text-xs font-medium ${isToday(day) ? "bg-sage text-white" : "text-charcoal"}`}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* タイムグリッド */}
      <div ref={scrollRef} className="overflow-y-auto max-h-[60vh] scrollbar-hide">
        <div ref={gridRef} className="grid grid-cols-8 relative" style={{ height: `${24 * HOUR_HEIGHT}px` }}>
          {/* 時間軸 */}
          <div className="border-r border-mist">
            {HOURS.map((h) => (
              <div key={h} className="text-[10px] text-muted-foreground text-right pr-2 -translate-y-2" style={{ height: `${HOUR_HEIGHT}px` }}>
                {h === 0 ? "" : `${h}:00`}
              </div>
            ))}
          </div>

          {/* 日ごとのカラム */}
          {weekDays.map((day, di) => {
            const dayEvents = getEventsForDay(events, day).filter((e) => !e.isAllDay);
            return (
              <div
                key={di}
                ref={(node) => { highlightRef.current[di] = node; }}
                className="border-r border-mist/60 relative transition-colors"
              >
                {/* 時間グリッド線 */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="border-t border-mist/40 hover:bg-sage/5 cursor-pointer"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                    onClick={() => !movedRef.current && onAddSchedule?.(day, h)}
                  />
                ))}

                {/* イベント */}
                {dayEvents.map((e) => {
                  const top = getEventTop(e);
                  const height = getEventHeight(e);
                  const bg = getRoleColor(e.roleCategory, e.color);
                  const textColor = getRoleTextColor(e.roleCategory);

                  return (
                    <div
                      key={e.id}
                      ref={(node) => { if (node) elMap.current.set(e.id, node); else elMap.current.delete(e.id); }}
                      className="absolute inset-x-0.5 rounded-lg overflow-visible z-10 touch-none"
                      style={{ top: `${top}px`, height: `${height}px`, backgroundColor: bg + "cc" }}
                    >
                      {/* 本体：タップ or ドラッグ */}
                      <div
                        className="px-1.5 pt-1 pb-4 h-full cursor-grab active:cursor-grabbing select-none"
                        onTouchStart={(ev) => startMove(ev, e, di)}
                        onMouseDown={(ev) => startMove(ev, e, di)}
                        onClick={() => { if (!movedRef.current) onSelectEvent(e); }}
                      >
                        <p className="text-[10px] font-medium truncate leading-tight" style={{ color: textColor }}>
                          {e.title}
                        </p>
                        <p data-time-label className="text-[9px] opacity-70 truncate" style={{ color: textColor }}>
                          {format(new Date(e.start), "HH:mm")}
                          {e.end && `–${format(new Date(e.end), "HH:mm")}`}
                        </p>
                      </div>

                      {/* リサイズハンドル */}
                      <div
                        className="absolute bottom-0 left-0 right-0 h-4 flex items-center justify-center cursor-s-resize select-none touch-none z-20"
                        onTouchStart={(ev) => { ev.stopPropagation(); startResize(ev, e, di); }}
                        onMouseDown={(ev) => { ev.stopPropagation(); startResize(ev, e, di); }}
                      >
                        <div className="w-5 h-0.5 rounded-full opacity-60" style={{ backgroundColor: textColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
