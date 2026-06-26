"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, MapPin } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Role, Schedule, ROLE_CATEGORY_COLORS, RoleCategory } from "@/types";

interface ScheduleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (schedule: Schedule) => void;
  roles: Role[];
  defaultDate?: Date;
  defaultHour?: number;
  linkedTaskId?: string;
  linkedTaskTitle?: string;
}

export function ScheduleFormModal({
  isOpen,
  onClose,
  onSaved,
  roles,
  defaultDate = new Date(),
  defaultHour,
  linkedTaskId,
  linkedTaskTitle,
}: ScheduleFormModalProps) {
  const supabase = createClient();
  const [title, setTitle] = useState(linkedTaskTitle || "");
  const [roleId, setRoleId] = useState<string | null>(null);
  const [date, setDate] = useState(format(defaultDate, "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState(
    defaultHour !== undefined
      ? `${String(defaultHour).padStart(2, "0")}:00`
      : "10:00"
  );
  const [endTime, setEndTime] = useState(
    defaultHour !== undefined
      ? `${String(defaultHour + 1).padStart(2, "0")}:00`
      : "11:00"
  );
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!title) return;
    setIsSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // ローカル時刻→UTC変換してSupabaseに保存
    const startDt = isAllDay
      ? `${date}T00:00:00`
      : new Date(`${date}T${startTime}:00`).toISOString();
    const endDt = isAllDay
      ? `${date}T23:59:59`
      : new Date(`${date}T${endTime}:00`).toISOString();

    const { data } = await supabase.from("schedules").insert({
      user_id: user.id,
      role_id: roleId,
      title,
      location: location || null,
      start_time: startDt,
      end_time: endDt,
      is_all_day: isAllDay,
      linked_task_id: linkedTaskId || null,
    }).select().single();

    // タスクに linked_schedule_id を設定
    if (data && linkedTaskId) {
      await supabase.from("tasks").update({
        linked_schedule_id: data.id,
        scheduled_at: startDt,
      }).eq("id", linkedTaskId);
    }

    setIsSaving(false);
    if (data) {
      onSaved(data as Schedule);
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* オーバーレイ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          />

          {/* モーダル */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-ivory rounded-t-3xl max-h-[90vh] overflow-y-auto max-w-md mx-auto pb-safe"
          >
            {/* ハンドル */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-mist rounded-full" />
            </div>

            {/* ヘッダー */}
            <div className="flex items-center justify-between px-5 py-3">
              <h3 className="font-medium text-charcoal">
                {linkedTaskTitle ? "TODOをカレンダーに入れる" : "予定を追加"}
              </h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-mist flex items-center justify-center">
                <X className="w-4 h-4 text-charcoal" />
              </button>
            </div>

            <div className="px-5 pb-8 space-y-4">
              {/* タイトル */}
              <div className="bg-white rounded-2xl px-4 py-3.5">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="予定のタイトル"
                  className="w-full text-base text-charcoal placeholder:text-muted-foreground focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Role選択 */}
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
                  <button
                    onClick={() => setIsAllDay((v) => !v)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                      isAllDay ? "bg-sage text-white" : "bg-mist text-muted-foreground"
                    }`}
                  >
                    終日
                  </button>
                </div>

                {!isAllDay && (
                  <div className="flex items-center gap-3">
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        // endTimeをstart+1時間に自動調整
                        const [h, m] = e.target.value.split(":").map(Number);
                        const endH = Math.min(h + 1, 23);
                        setEndTime(`${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
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
              </div>

              {/* 場所 */}
              <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="場所（任意）"
                  className="flex-1 text-sm text-charcoal placeholder:text-muted-foreground focus:outline-none bg-transparent"
                />
              </div>

              {/* 保存ボタン */}
              <motion.button
                onClick={handleSave}
                disabled={!title || isSaving}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl bg-sage text-white font-medium disabled:opacity-40"
              >
                {isSaving ? "保存中..." : "カレンダーに追加する"}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
