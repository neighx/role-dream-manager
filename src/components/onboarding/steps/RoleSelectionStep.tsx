"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { RoleCategory, ROLE_CATEGORY_COLORS } from "@/types";

interface RoleSelectionStepProps {
  selected: RoleCategory[];
  onChange: (roles: RoleCategory[]) => void;
}

const ROLES: {
  category: RoleCategory;
  emoji: string;
  description: string;
  keywords: string;
}[] = [
  {
    category: "creator",
    emoji: "🎵",
    description: "クリエイター",
    keywords: "音楽、絵、漫画、映像、イベント、DJ",
  },
  {
    category: "health",
    emoji: "🌿",
    description: "健康・スポーツ",
    keywords: "運動、睡眠、食事、体づくり",
  },
  {
    category: "work",
    emoji: "💼",
    description: "仕事・ビジネス",
    keywords: "従業員、経営、個人事業、営業",
  },
  {
    category: "relationship",
    emoji: "💛",
    description: "恋愛・人間関係",
    keywords: "恋人、家族、友人、仲間",
  },
  {
    category: "learning",
    emoji: "🌍",
    description: "学び・未来",
    keywords: "英語、勉強、資格、海外、夢",
  },
  {
    category: "selfcare",
    emoji: "🕯",
    description: "自分のケア",
    keywords: "感情、休息、生活習慣、自己理解",
  },
];

export function RoleSelectionStep({ selected, onChange }: RoleSelectionStepProps) {
  function toggle(cat: RoleCategory) {
    if (selected.includes(cat)) {
      onChange(selected.filter((c) => c !== cat));
    } else if (selected.length < 3) {
      onChange([...selected, cat]);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* タイトル */}
      <div className="space-y-2 pt-4">
        <h2 className="text-2xl font-medium text-charcoal leading-tight">
          今のあなたにとって
          <br />
          大切な役割を
          <br />
          選んでください
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          まずは3つまで選びましょう。<br />あとからいつでも追加できます。
        </p>
      </div>

      {/* 選択数インジケーター */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all ${
              i < selected.length ? "bg-sage" : "bg-mist"
            }`}
          />
        ))}
      </div>

      {/* Roleカード */}
      <div className="space-y-3">
        {ROLES.map((role, i) => {
          const isSelected = selected.includes(role.category);
          const isDisabled = !isSelected && selected.length >= 3;
          const colors = ROLE_CATEGORY_COLORS[role.category];

          return (
            <motion.button
              key={role.category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => toggle(role.category)}
              disabled={isDisabled}
              className={`w-full flex items-center gap-4 px-5 py-5 rounded-3xl border-2 transition-all text-left ${
                isSelected
                  ? "border-sage"
                  : isDisabled
                  ? "border-transparent bg-white/50 opacity-40"
                  : "border-transparent bg-white hover:border-mist"
              }`}
              style={isSelected ? { backgroundColor: colors.bg + "40" } : {}}
            >
              {/* カラーアイコン */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                style={{ backgroundColor: colors.bg }}
              >
                {role.emoji}
              </div>

              {/* テキスト */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-charcoal text-base">
                  {role.description}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {role.keywords}
                </p>
              </div>

              {/* チェック */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-6 rounded-full bg-sage flex items-center justify-center shrink-0"
                >
                  <Check className="w-3.5 h-3.5 text-white" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
