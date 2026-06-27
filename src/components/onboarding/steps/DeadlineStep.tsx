"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

export type DeadlineType = "today" | "this_week" | "this_month" | "3months" | "date" | "undecided";

const PRESET_DEADLINES: { type: DeadlineType; label: string; emoji: string }[] = [
  { type: "today",      label: "今日",        emoji: "🌅" },
  { type: "this_week",  label: "今週中",      emoji: "📅" },
  { type: "this_month", label: "今月中",      emoji: "🗓" },
  { type: "3months",    label: "3ヶ月以内",   emoji: "🌱" },
  { type: "date",       label: "日付を選ぶ",  emoji: "📌" },
  { type: "undecided",  label: "まだ決めない", emoji: "💭" },
];

interface DeadlineStepProps {
  deadlineType: DeadlineType | null;
  deadlineDate: string | null;
  onChangeType: (t: DeadlineType) => void;
  onChangeDate: (d: string | null) => void;
}

export function DeadlineStep({ deadlineType, deadlineDate, onChangeType, onChangeDate }: DeadlineStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 pt-4"
    >
      <div className="space-y-2">
        <h2 className="text-2xl font-medium text-charcoal leading-tight">
          いつまでに
          <br />
          やりたいですか？
        </h2>
        <p className="text-sm text-muted-foreground">
          だいたいでも大丈夫です。
        </p>
      </div>

      <div className="space-y-2.5">
        {PRESET_DEADLINES.map((d, i) => {
          const isSelected = deadlineType === d.type;
          return (
            <motion.button
              key={d.type}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => { onChangeType(d.type); if (d.type !== "date") onChangeDate(null); }}
              className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all text-left ${
                isSelected ? "border-sage bg-sage/10" : "border-transparent bg-white"
              }`}
            >
              <span className="text-xl shrink-0">{d.emoji}</span>
              <span className="text-sm text-charcoal font-medium flex-1">{d.label}</span>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-sage flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </motion.button>
          );
        })}

        {deadlineType === "date" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <input
              type="date"
              value={deadlineDate || ""}
              onChange={(e) => onChangeDate(e.target.value || null)}
              className="w-full text-sm text-charcoal bg-white rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-sage/40 border border-mist"
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
