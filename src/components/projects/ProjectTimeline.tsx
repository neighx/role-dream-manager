"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Circle, Pencil, Plus } from "lucide-react";
import { ProjectTask } from "@/types";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface TaskUpdate {
  title?: string;
  due_date?: string | null;
  estimated_minutes?: number | null;
}

interface NewTask {
  title: string;
  due_date: string | null;
  estimated_minutes: number | null;
}

interface Props {
  tasks: ProjectTask[];
  targetDate?: string;
  onToggleStatus?: (taskId: string, status: ProjectTask["status"]) => void;
  onUpdateTask?: (taskId: string, updates: TaskUpdate) => void;
  onAddTask?: (task: NewTask) => void;
}

export function ProjectTimeline({
  tasks,
  targetDate,
  onToggleStatus,
  onUpdateTask,
  onAddTask,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editMinutes, setEditMinutes] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newMinutes, setNewMinutes] = useState("");

  function startEdit(task: ProjectTask) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDate(task.due_date ?? "");
    setEditMinutes(task.estimated_minutes?.toString() ?? "");
  }

  function saveEdit(taskId: string) {
    onUpdateTask?.(taskId, {
      title: editTitle,
      due_date: editDate || null,
      estimated_minutes: editMinutes ? parseInt(editMinutes) : null,
    });
    setEditingId(null);
  }

  function saveNew() {
    if (!newTitle.trim()) return;
    onAddTask?.({
      title: newTitle.trim(),
      due_date: newDate || null,
      estimated_minutes: newMinutes ? parseInt(newMinutes) : null,
    });
    setNewTitle("");
    setNewDate("");
    setNewMinutes("");
    setShowAddForm(false);
  }

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
            {(i < entries.length - 1 || onAddTask) && (
              <div className="w-px flex-1 bg-border mt-1" />
            )}
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
              {dateTasks.map((task) =>
                editingId === task.id ? (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl border border-sage/40 bg-sage/5 space-y-2"
                  >
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-sage/30"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-border focus:outline-none"
                      />
                      <input
                        type="number"
                        value={editMinutes}
                        onChange={(e) => setEditMinutes(e.target.value)}
                        placeholder="分"
                        className="w-16 px-2 py-1.5 text-xs rounded-lg border border-border focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(task.id)}
                        className="flex-1 py-1.5 rounded-lg bg-sage text-white text-xs font-medium"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
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
                    {onUpdateTask && (
                      <button
                        onClick={() => startEdit(task)}
                        className="shrink-0 p-1 rounded-lg hover:bg-mist"
                      >
                        <Pencil className="w-3 h-3 text-muted-foreground" />
                      </button>
                    )}
                  </motion.div>
                )
              )}
            </div>
          </div>
        </div>
      ))}

      {/* タスクを追加 */}
      {onAddTask && (
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full mt-1 shrink-0 bg-border/50" />
          </div>
          <div className="flex-1 pb-4">
            {showAddForm ? (
              <div className="p-3 rounded-xl border border-sage/40 bg-sage/5 space-y-2">
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="タスク名を入力"
                  className="w-full px-2 py-1.5 text-sm rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-sage/30"
                  autoFocus
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-border focus:outline-none"
                  />
                  <input
                    type="number"
                    value={newMinutes}
                    onChange={(e) => setNewMinutes(e.target.value)}
                    placeholder="分"
                    className="w-16 px-2 py-1.5 text-xs rounded-lg border border-border focus:outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={saveNew}
                    disabled={!newTitle.trim()}
                    className="flex-1 py-1.5 rounded-lg bg-sage text-white text-xs font-medium disabled:opacity-40"
                  >
                    追加
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewTitle("");
                      setNewDate("");
                      setNewMinutes("");
                    }}
                    className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-1.5 text-xs text-sage py-1"
              >
                <Plus className="w-3.5 h-3.5" />
                タスクを追加
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
