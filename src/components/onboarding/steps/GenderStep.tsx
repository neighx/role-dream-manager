"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

type Gender = "female" | "male" | "other" | "unanswered";

interface GenderStepProps {
  value: Gender | null;
  onChange: (value: Gender) => void;
}

const OPTIONS: { value: Gender; label: string; emoji: string }[] = [
  { value: "female", label: "女性", emoji: "🌸" },
  { value: "male", label: "男性", emoji: "🌿" },
  { value: "other", label: "その他", emoji: "✨" },
  { value: "unanswered", label: "回答しない", emoji: "—" },
];

export function GenderStep({ value, onChange }: GenderStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* タイトル */}
      <div className="space-y-2 pt-4">
        <h2 className="text-2xl font-medium text-charcoal leading-tight">
          あなたについて
          <br />
          少し教えてください
        </h2>
        <p className="text-sm text-muted-foreground">性別は何ですか？</p>
      </div>

      {/* 選択カード */}
      <div className="space-y-3">
        {OPTIONS.map((opt, i) => (
          <motion.button
            key={opt.value}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            onClick={() => onChange(opt.value)}
            className={`w-full flex items-center justify-between px-5 py-5 rounded-3xl border-2 transition-all ${
              value === opt.value
                ? "border-sage bg-sage/8"
                : "border-transparent bg-white hover:border-mist"
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">{opt.emoji}</span>
              <span className="text-base font-medium text-charcoal">
                {opt.label}
              </span>
            </div>
            {value === opt.value && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-6 h-6 rounded-full bg-sage flex items-center justify-center"
              >
                <Check className="w-3.5 h-3.5 text-white" />
              </motion.div>
            )}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
