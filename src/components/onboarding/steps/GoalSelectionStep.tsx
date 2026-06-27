"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Pencil } from "lucide-react";

const PRESET_GOALS = [
  { emoji: "🎵", label: "曲を完成させたい" },
  { emoji: "🎪", label: "イベントを開催したい" },
  { emoji: "📚", label: "勉強を進めたい" },
  { emoji: "🌿", label: "運動・健康を整えたい" },
  { emoji: "💼", label: "仕事・お金の準備をしたい" },
  { emoji: "💛", label: "恋愛・人間関係を大切にしたい" },
];

interface GoalSelectionStepProps {
  value: string;
  onChange: (v: string) => void;
}

export function GoalSelectionStep({ value, onChange }: GoalSelectionStepProps) {
  const [showCustom, setShowCustom] = useState(
    !!value && !PRESET_GOALS.some((g) => g.label === value)
  );

  function selectPreset(label: string) {
    setShowCustom(false);
    onChange(label);
  }

  function openCustom() {
    setShowCustom(true);
    onChange("");
  }

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
          今、まず進めたいことは
          <br />
          ありますか？
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          近い予定でも、やりたいことでも大丈夫です。
        </p>
      </div>

      <div className="space-y-2.5">
        {PRESET_GOALS.map((g, i) => {
          const isSelected = value === g.label && !showCustom;
          return (
            <motion.button
              key={g.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => selectPreset(g.label)}
              className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all text-left ${
                isSelected
                  ? "border-sage bg-sage/10"
                  : "border-transparent bg-white"
              }`}
            >
              <span className="text-xl shrink-0">{g.emoji}</span>
              <span className="text-sm text-charcoal font-medium flex-1">{g.label}</span>
              {isSelected && (
                <div className="w-5 h-5 rounded-full bg-sage flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </motion.button>
          );
        })}

        {/* まだ決まっていない */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: PRESET_GOALS.length * 0.05 }}
          onClick={() => { setShowCustom(false); onChange("まだ決まっていない"); }}
          className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all text-left ${
            value === "まだ決まっていない" && !showCustom
              ? "border-sage bg-sage/10"
              : "border-transparent bg-white/60"
          }`}
        >
          <span className="text-xl shrink-0">🌱</span>
          <span className="text-sm text-muted-foreground flex-1">まだ決まっていない</span>
        </motion.button>

        {/* 自分で入力 */}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: (PRESET_GOALS.length + 1) * 0.05 }}
          onClick={openCustom}
          className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all text-left ${
            showCustom ? "border-sage bg-sage/10" : "border-dashed border-mist bg-white/60"
          }`}
        >
          <Pencil className="w-5 h-5 text-sage shrink-0" />
          <span className="text-sm text-charcoal flex-1">自分で入力する</span>
        </motion.button>

        {showCustom && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="space-y-2"
          >
            <textarea
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={"例：7月30日にイベントを開催したい\n来月までに曲を完成させたい\n英語を毎日15分やりたい"}
              className="w-full text-sm text-charcoal bg-white rounded-2xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-sage/40 resize-none border border-mist"
              rows={4}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
