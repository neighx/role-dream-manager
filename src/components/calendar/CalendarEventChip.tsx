"use client";

import { CalendarEvent } from "@/types";
import { getRoleColor, getRoleTextColor } from "@/lib/calendar/calendarUtils";

interface CalendarEventChipProps {
  event: CalendarEvent;
  compact?: boolean;
  onClick?: () => void;
  onSelectEvent?: (event: CalendarEvent) => void;
}

export function CalendarEventChip({ event, compact = false, onClick, onSelectEvent }: CalendarEventChipProps) {
  const handleClick = () => {
    if (onClick) onClick();
    if (onSelectEvent) onSelectEvent(event);
  };
  const bg = getRoleColor(event.roleCategory, event.color);
  const textColor = getRoleTextColor(event.roleCategory);
  const isDone =
    (event.type === "task" || event.type === "project_task") &&
    (event.sourceData as any).status === "done";
  const isProjectTask = event.type === "project_task";

  if (compact) {
    return (
      <button
        onClick={handleClick}
        className="w-full flex items-center gap-1 px-1.5 py-0.5 rounded-md text-left truncate"
        style={{ backgroundColor: bg + "80" }}
      >
        {event.type === "task" && (
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: textColor }} />
        )}
        <span className="text-[10px] truncate" style={{ color: textColor, textDecoration: isDone ? "line-through" : "none" }}>
          {event.title}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-2xl text-left transition-all active:scale-[0.98]"
      style={{ backgroundColor: bg + "50" }}
    >
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-medium truncate"
          style={{ color: textColor, textDecoration: isDone ? "line-through" : "none" }}
        >
          {isProjectTask && <span className="mr-1">🎯</span>}
          {event.title}
        </p>
        {event.type === "schedule" && !event.isAllDay && (
          <p className="text-[10px] mt-0.5" style={{ color: textColor + "99" }}>
            {new Date(event.start).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
      <div
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: event.type === "task" ? textColor + "80" : textColor }}
      />
    </button>
  );
}
