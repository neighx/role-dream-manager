"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { format, isSameMonth, isToday } from "date-fns";
import { ja } from "date-fns/locale";
import { getMonthGrid, getEventsForDay, getRoleColor, getRoleTextColor } from "@/lib/calendar/calendarUtils";
import { CalendarEvent, MoodType } from "@/types";

const MOOD_EMOJI_SMALL: Record<MoodType, string> = {
  great: "🌟", good: "😊", okay: "😐", tired: "😴", rough: "😔",
};
import { CalendarEventChip } from "./CalendarEventChip";

const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedDate: Date;
  dailyLogMap?: Record<string, { mood_after: MoodType | null }>;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onEventMoved?: (event: CalendarEvent, newStart: Date, newEnd: Date) => Promise<void>;
}

export function MonthView({ currentDate, events, selectedDate, dailyLogMap = {}, onSelectDate, onSelectEvent, onEventMoved }: MonthViewProps) {
  const weeks = getMonthGrid(currentDate);

  const ghostRef = useRef<HTMLDivElement | null>(null);
  const draggingEventRef = useRef<CalendarEvent | null>(null);
  const movedRef = useRef(false);
  const targetDateRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isDraggingRef = useRef(false);

  useEffect(() => {
    function onMove(e: TouchEvent | MouseEvent) {
      if (!draggingEventRef.current) return;
      e.preventDefault();
      movedRef.current = true;
      isDraggingRef.current = true;

      const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

      if (ghostRef.current) {
        ghostRef.current.style.left = `${clientX}px`;
        ghostRef.current.style.top = `${clientY}px`;
      }

      // Find which day cell is under the finger
      if (ghostRef.current) ghostRef.current.style.display = "none";
      const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      if (ghostRef.current) ghostRef.current.style.display = "";

      // Walk up to find data-date attribute
      let target: HTMLElement | null = el;
      while (target && !target.dataset.date) {
        target = target.parentElement;
      }

      const dateStr = target?.dataset.date ?? null;
      if (dateStr !== targetDateRef.current) {
        // Clear old highlight
        if (targetDateRef.current) {
          const old = cellRefs.current.get(targetDateRef.current);
          if (old) old.style.backgroundColor = "";
        }
        // Set new highlight
        if (dateStr) {
          const newCell = cellRefs.current.get(dateStr);
          if (newCell) newCell.style.backgroundColor = "rgba(139,168,138,0.15)";
        }
        targetDateRef.current = dateStr;
      }
    }

    async function onEnd() {
      if (!draggingEventRef.current) return;

      // Clear highlight
      if (targetDateRef.current) {
        const cell = cellRefs.current.get(targetDateRef.current);
        if (cell) cell.style.backgroundColor = "";
      }

      // Remove ghost
      if (ghostRef.current) {
        document.body.removeChild(ghostRef.current);
        ghostRef.current = null;
      }

      const event = draggingEventRef.current;
      draggingEventRef.current = null;

      if (!movedRef.current || !targetDateRef.current || !onEventMoved || savingRef.current) {
        isDraggingRef.current = false;
        return;
      }

      savingRef.current = true;

      const originalStart = new Date(event.start);
      // Use local date (YYYY-MM-DD) to set the new day
      const [y, m, d] = targetDateRef.current.split("-").map(Number);
      const newStart = new Date(y, m - 1, d, originalStart.getHours(), originalStart.getMinutes(), 0, 0);
      const dur = event.end
        ? new Date(event.end).getTime() - originalStart.getTime()
        : 3600000;
      const newEnd = new Date(newStart.getTime() + dur);

      await onEventMoved(event, newStart, newEnd);

      savingRef.current = false;
      targetDateRef.current = null;
      isDraggingRef.current = false;
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
  }, [onEventMoved]);

  function startMonthDrag(
    e: React.TouchEvent | React.MouseEvent,
    event: CalendarEvent
  ) {
    e.stopPropagation();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    movedRef.current = false;
    isDraggingRef.current = false;
    draggingEventRef.current = event;

    const bg = getRoleColor(event.roleCategory, event.color);
    const textColor = getRoleTextColor(event.roleCategory);

    const ghost = document.createElement("div");
    ghost.style.cssText = [
      "position:fixed",
      "z-index:200",
      "pointer-events:none",
      "padding:3px 8px",
      "border-radius:8px",
      "font-size:11px",
      "font-weight:500",
      "white-space:nowrap",
      "opacity:0.9",
      `box-shadow:0 6px 16px rgba(0,0,0,0.2)`,
      "transform:translate(-50%,-120%)",
      `background-color:${bg}`,
      `color:${textColor}`,
      `left:${clientX}px`,
      `top:${clientY}px`,
    ].join(";");
    ghost.textContent = event.title;
    document.body.appendChild(ghost);
    ghostRef.current = ghost;
  }

  return (
    <div className="bg-white rounded-3xl overflow-hidden">
      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 border-b border-mist">
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            className={`py-2.5 text-center text-xs font-medium ${
              i === 0 ? "text-rose-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* カレンダーグリッド */}
      <div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day, di) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayEvents = getEventsForDay(events, day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isToday(day);
              const isSelected = dateStr === format(selectedDate, "yyyy-MM-dd");
              const dayLog = dailyLogMap[dateStr];

              return (
                <div
                  key={di}
                  ref={(node) => {
                    if (node) cellRefs.current.set(dateStr, node);
                    else cellRefs.current.delete(dateStr);
                  }}
                  data-date={dateStr}
                  className={`min-h-[72px] p-1.5 border-b border-r border-mist/60 flex flex-col gap-1 transition-colors ${
                    isSelected ? "bg-sage/8" : ""
                  }`}
                >
                  {/* 日付 + 1mm日記インジケーター */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (!isDraggingRef.current) onSelectDate(day);
                    }}
                    className="flex flex-col items-center w-full gap-0.5"
                  >
                    <div
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-xs ${
                        isTodayDate
                          ? "bg-sage text-white font-bold"
                          : isSelected
                          ? "bg-sage/20 text-sage font-medium"
                          : isCurrentMonth
                          ? di === 0 ? "text-rose-400" : di === 6 ? "text-blue-400" : "text-charcoal"
                          : "text-muted-foreground/40"
                      }`}
                    >
                      {format(day, "d")}
                    </div>
                    {dayLog && (
                      <span className="text-[9px] leading-none">
                        {dayLog.mood_after ? MOOD_EMOJI_SMALL[dayLog.mood_after] : "📝"}
                      </span>
                    )}
                  </motion.button>

                  {/* イベント（ドラッグ対応） */}
                  <div className="space-y-0.5 w-full">
                    {dayEvents.slice(0, 2).map((e) => (
                      <div
                        key={e.id}
                        onTouchStart={(ev) => startMonthDrag(ev, e)}
                        onMouseDown={(ev) => startMonthDrag(ev, e)}
                      >
                        <CalendarEventChip
                          event={e}
                          compact
                          onSelectEvent={(evt) => {
                            if (!movedRef.current) onSelectEvent(evt);
                          }}
                        />
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="text-[10px] text-muted-foreground pl-1.5">
                        +{dayEvents.length - 2}件
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
