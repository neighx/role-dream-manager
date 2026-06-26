"use client";
import { motion } from "framer-motion";
import { Check, Circle } from "lucide-react";
import { ProjectTask } from "@/types";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface Props {
  tasks: ProjectTask[];
  targetDate?: string;
  onToggleStatus?: (taskId: string, status: ProjectTask["status"]) => void;
}

export function ProjectTimeline({ tasks, targetDate, onToggleStatus }: Props) {
  const sorted = [...tasks].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });

  const grouped: Record<string, ProjectTask[]> = {};
  for (const task of sorted) {
    const key = task.due_date ?? "未定";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(task);
  }
  if (targetDate && !grouped[targetDate]) {
    grouped[targetDate] = [];
  }

  const entries = Object.entries(grouped);

  return (
    <div className="space-y-0">
      {entries.map(([date, dateTasks], i) => (
        <div key={date} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                date === targetDate ? "bg-sage" : "bg-border"
              }`}
            />
            {i < entries.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
          </div>
          <div className="flex-1 pb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {date === "未定"
                ? "未定"
                : date === targetDate
                ? `🎯 ${format(new Date(date), "M月d日(E)", { locale: ja })} 締切`
                : format(new Date(date), "M月d日(E)", { locale: ja })}
            </p>
            <div className="space-y-2">
              {dateTasks.map((task) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-start gap-2 p-3 rounded-xl border ${
                    task.status === "done"
                      ? "bg-mist border-border opacity-60"
                      : "bg-white border-border"
                  }`}
                >
                  <button
                    onClick={() =>
                      onToggleStatus?.(
                        task.id,
                        task.status === "done" ? "todo" : "done"
                      )
                    }
                    className="mt-0.5 shrink-0"
                  >
                    {task.status === "done" ? (
                      <Check className="w-4 h-4 text-sage" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        task.status === "done"
                          ? "line-through text-muted-foreground"
                          : "text-charcoal"
                      }`}
                    >
                      {task.title}
                    </p>
                    {task.estimated_minutes && (
                      <span className="text-xs text-muted-foreground">
                        {task.estimated_minutes}分
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
