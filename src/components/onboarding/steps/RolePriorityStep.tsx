"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { RoleCategory, ROLE_CATEGORY_COLORS } from "@/types";

const ROLE_VALUES: Record<RoleCategory, { label: string; emoji: string }[]> = {
  creator: [
    { label: "作品を作る", emoji: "🎨" },
    { label: "練習を続ける", emoji: "🔁" },
    { label: "発信する", emoji: "📣" },
    { label: "ライブ・発表する", emoji: "🎤" },
    { label: "コラボする", emoji: "🤝" },
    { label: "世界観を育てる", emoji: "🌱" },
    { label: "収益につなげる", emoji: "💰" },
    { label: "ファンとつながる", emoji: "💫" },
    { label: "アイデアを記録する", emoji: "📝" },
    { label: "ポートフォリオを整える", emoji: "🗂" },
  ],
  health: [
    { label: "睡眠を整える", emoji: "🌙" },
    { label: "運動する", emoji: "🏃" },
    { label: "体力をつける", emoji: "💪" },
    { label: "食事を整える", emoji: "🥗" },
    { label: "ストレスを減らす", emoji: "☁️" },
    { label: "体型を整える", emoji: "✨" },
    { label: "メンタルを安定させる", emoji: "🧘" },
    { label: "毎日歩く", emoji: "👟" },
    { label: "清潔感を整える", emoji: "🪥" },
  ],
  work: [
    { label: "締切を守る", emoji: "📅" },
    { label: "成果を出す", emoji: "📈" },
    { label: "売上を上げる", emoji: "💹" },
    { label: "習慣化する", emoji: "🔄" },
    { label: "チームで進める", emoji: "👥" },
    { label: "段取りを整える", emoji: "📋" },
    { label: "学ぶ", emoji: "📚" },
    { label: "継続する", emoji: "🔥" },
    { label: "信頼を積む", emoji: "🏛" },
  ],
  relationship: [
    { label: "感謝を伝える", emoji: "🙏" },
    { label: "会う時間を作る", emoji: "☕" },
    { label: "話を聞く", emoji: "👂" },
    { label: "安心感を与える", emoji: "🫂" },
    { label: "記念日を大切にする", emoji: "🎁" },
    { label: "ケンカを減らす", emoji: "🕊" },
    { label: "つながりを深める", emoji: "💛" },
    { label: "連絡を大切にする", emoji: "💌" },
  ],
  learning: [
    { label: "英語を話せるようになる", emoji: "🗣" },
    { label: "毎日勉強する", emoji: "✏️" },
    { label: "海外につながる", emoji: "✈️" },
    { label: "夢を明確にする", emoji: "⭐" },
    { label: "新しい知識を得る", emoji: "💡" },
    { label: "行動力をつける", emoji: "⚡" },
    { label: "将来の準備をする", emoji: "🗺" },
    { label: "自信をつける", emoji: "🌟" },
  ],
  selfcare: [
    { label: "感情を整える", emoji: "💭" },
    { label: "休む", emoji: "🛋" },
    { label: "生活リズムを整える", emoji: "⏰" },
    { label: "自分を責めない", emoji: "🤍" },
    { label: "深呼吸する", emoji: "🌬" },
    { label: "記録する", emoji: "📔" },
    { label: "気分を知る", emoji: "🌈" },
    { label: "部屋を整える", emoji: "🏠" },
    { label: "自分を褒める", emoji: "🎉" },
  ],
};

const ROLE_NAMES: Record<RoleCategory, string> = {
  creator: "クリエイター",
  health: "健康・スポーツ",
  work: "仕事・ビジネス",
  relationship: "恋愛・人間関係",
  learning: "学び・未来",
  selfcare: "自分のケア",
};

interface RolePriorityStepProps {
  roleCategory: RoleCategory;
  selected: string[];
  onChange: (values: string[]) => void;
}

export function RolePriorityStep({
  roleCategory,
  selected,
  onChange,
}: RolePriorityStepProps) {
  const options = ROLE_VALUES[roleCategory];
  const colors = ROLE_CATEGORY_COLORS[roleCategory];

  function toggle(label: string) {
    if (selected.includes(label)) {
      onChange(selected.filter((v) => v !== label));
    } else if (selected.length < 3) {
      onChange([...selected, label]);
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
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {roleCategory === "creator" && "🎵"}
          {roleCategory === "health" && "🌿"}
          {roleCategory === "work" && "💼"}
          {roleCategory === "relationship" && "💛"}
          {roleCategory === "learning" && "🌍"}
          {roleCategory === "selfcare" && "🕯"}
          {ROLE_NAMES[roleCategory]}
        </div>
        <h2 className="text-xl font-medium text-charcoal leading-tight">
          {ROLE_NAMES[roleCategory]}として、<br />
          何を大切にしたいですか？
        </h2>
        <p className="text-sm text-muted-foreground">3つ選んでください。</p>
      </div>

      {/* 選択数インジケーター */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-all"
            style={{
              backgroundColor: i < selected.length ? colors.bg : "#E8E6E0",
            }}
          />
        ))}
      </div>

      {/* 選択肢グリッド */}
      <div className="grid grid-cols-2 gap-2.5">
        {options.map((opt, i) => {
          const isSelected = selected.includes(opt.label);
          const isDisabled = !isSelected && selected.length >= 3;

          return (
            <motion.button
              key={opt.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => toggle(opt.label)}
              disabled={isDisabled}
              className={`flex items-center gap-2.5 px-4 py-3.5 rounded-2xl border-2 text-left transition-all ${
                isSelected
                  ? "border-2"
                  : isDisabled
                  ? "border-transparent bg-white/50 opacity-40"
                  : "border-transparent bg-white hover:border-mist"
              }`}
              style={
                isSelected
                  ? {
                      borderColor: colors.border,
                      backgroundColor: colors.bg + "30",
                    }
                  : {}
              }
            >
              <span className="text-lg shrink-0">{opt.emoji}</span>
              <span className="text-sm text-charcoal font-medium leading-tight">
                {opt.label}
              </span>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: colors.text }}
                >
                  <Check className="w-2.5 h-2.5 text-white" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
