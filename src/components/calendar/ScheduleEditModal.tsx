"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, MapPin, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { CalendarEvent, Role, Schedule, ROLE_CATEGORY_COLORS, RoleCategory } from "@/types";

interface ScheduleEditModalProps {
  event: CalendarEvent | null;
  roles: Role[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

function toLocalTimeString(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ScheduleEditModal({ event, roles, onClose, onSaved, onDeleted }: ScheduleEditModalProps) {
  const isOpen = event !== null;
  const supabase = createClient();

  const start = event ? new Date(event.start) : new Date();
  const end = event?.end ? new Date(event.end) : new Date(start.getTime() + 3600000);

  const [title, setTitle] = useState(event?.title ?? "");
  const [roleId, setRoleId] = useState<string | null>(event?.roleId ?? null);
  const [date, setDate] = useState(format(start, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(toLocalTimeString(start));
  const [endTime, setEndTime] = useState(toLocalTimeString(end));
  const [isAllDay, setIsAllDay] = useState(event?.isAllDay ?? false);
  const [location, setLocation] = useState(
    event?.type === "schedule" ? (event.sourceData as Schedule).location ?? "" : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isTask = event?.type === "task";

  async function handleSave() {
    if (!event || !title) return;
    setIsSaving(true);

    const startDt = isAllDay
      ? `${date}T00:00:00`
      : new Date(`${date}T${startTime}:00`).toISOString();
    const endDt = isAllDay
      ? `${date}T23:59:59`
      : new Date(`${date}T${endTime}:00`).toISOString();

    if (isTask) {
      await supabase.from("tasks").update({
        scheduled_at: startDt,
        estimated_minutes: Math.round((new Date(endDt).getTime() - new Date(startDt).getTime()) / 60000),
      }).eq("id", event.sourceData.id);
    } else {
      await supabase.from("schedules").update({
        title,
        role_id: roleId,
        start_time: startDt,
        end_time: endDt,
        is_all_day: isAllDay,
        location: location || null,
      }).eq("id", event.id);
    }

    setIsSaving(false);
    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!event) return;
    setIsDeleting(true);

    if (isTask) {
      await supabase.from("tasks").update({ scheduled_at: null }).eq("id", event.sourceData.id);
    } else {
      await supabase.from("schedules").delete().eq("id", event.id);
    }

    setIsDeleting(false);
    onDeleted();
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-ivory rounded-t-3xl max-h-[90vh] overflow-y-auto max-w-md mx-auto pb-safe"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-mist rounded-full" />
            </div>

            <div className="flex items-center justify-between px-5 py-3">
              <h3 className="font-medium text-charcoal">
                {isTask ? "タスクの時間を編集" : "予定を編集"}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-mist flex items-center justify-center">
                  <X className="w-4 h-4 text-charcoal" />
                </button>
              </div>
            </div>

            {/* 削除確認 */}
            <AnimatePresence>
              {showDeleteConfirm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mx-5 mb-3 bg-red-50 border border-red-200 rounded-2xl p-4"
                >
                  <p className="text-sm text-red-700 font-medium mb-3">
                    {isTask ? "カレンダーから削除しますか？" : "この予定を削除しますか？"}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 rounded-xl bg-white border border-red-200 text-sm text-red-400"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-50"
                    >
                      {isDeleting ? "削除中..." : "削除する"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="px-5 pb-8 space-y-4">
              {/* タイトル */}
              {!isTask && (
                <div className="bg-white rounded-2xl px-4 py-3.5">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="予定のタイトル"
                    className="w-full text-base text-charcoal placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
              )}

              {/* Role選択（スケジュールのみ） */}
              {!isTask && (
                <div className="bg-white rounded-2xl p-4">
                  <p className="text-xs text-muted-foreground mb-2">紐づくRole</p>
                  <div className="flex flex-wrap gap-2">
                    {roles.map((r) => {
                      const colors = ROLE_CATEGORY_COLORS[r.category as RoleCategory];
                      const isSelected = roleId === r.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => setRoleId(isSelected ? null : r.id)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                          style={{
                            backgroundColor: isSelected ? colors.bg : "#F0EEE9",
                            color: isSelected ? colors.text : "#888680",
                          }}
                        >
                          {r.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 日付・時間 */}
              <div className="bg-white rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="text-sm text-charcoal focus:outline-none bg-transparent"
                    />
                  </div>
                  {!isTask && (
                    <button
                      onClick={() => setIsAllDay((v) => !v)}
                      className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                        isAllDay ? "bg-sage text-white" : "bg-mist text-muted-foreground"
                      }`}
                    >
                      終日
                    </button>
                  )}
                </div>

                {!isAllDay && (
                  <div className="flex items-center gap-3">
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        const [h, m] = e.target.value.split(":").map(Number);
                        const [eh, em] = endTime.split(":").map(Number);
                        const dur = (eh * 60 + em) - (
                          (() => {
                            const s = start;
                            return s.getHours() * 60 + s.getMinutes();
                          })()
                        );
                        const newEndMin = h * 60 + m + Math.max(dur, 30);
                        const newEH = Math.min(Math.floor(newEndMin / 60), 23);
                        const newEM = newEndMin % 60;
                        setEndTime(`${String(newEH).padStart(2, "0")}:${String(newEM).padStart(2, "0")}`);
                      }}
                      className="text-sm text-charcoal focus:outline-none bg-mist rounded-xl px-3 py-2 flex-1"
                    />
                    <span className="text-muted-foreground text-sm">—</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="text-sm text-charcoal focus:outline-none bg-mist rounded-xl px-3 py-2 flex-1"
                    />
                  </div>
                )}

                {/* 時間の長さ表示 */}
                {!isAllDay && (
                  <p className="text-xs text-muted-foreground text-right">
                    {(() => {
                      const [sh, sm] = startTime.split(":").map(Number);
                      const [eh, em] = endTime.split(":").map(Number);
                      const dur = (eh * 60 + em) - (sh * 60 + sm);
                      if (dur <= 0) return "";
                      const h = Math.floor(dur / 60);
                      const m = dur % 60;
                      return h > 0 ? `${h}時間${m > 0 ? m + "分" : ""}` : `${m}分`;
                    })()}
                  </p>
                )}
              </div>

              {/* 場所（スケジュールのみ） */}
              {!isTask && (
                <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="場所（任意）"
                    className="flex-1 text-sm text-charcoal placeholder:text-muted-foreground focus:outline-none bg-transparent"
                  />
                </div>
              )}

              {/* 保存ボタン */}
              <motion.button
                onClick={handleSave}
                disabled={(!title && !isTask) || isSaving}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl bg-sage text-white font-medium disabled:opacity-40"
              >
                {isSaving ? "保存中..." : "変更を保存する"}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
