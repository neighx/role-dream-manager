"use client";

import { motion } from "framer-motion";
import { RoleCategory, ROLE_CATEGORY_COLORS } from "@/types";

const ROLE_NAMES: Record<RoleCategory, string> = {
  creator: "クリエイター",
  health: "健康・スポーツ",
  work: "仕事・ビジネス",
  relationship: "恋愛・人間関係",
  learning: "学び・未来",
  selfcare: "自分のケア",
};

interface DreamData {
  dream: string;
  threeYearGoal: string;
  oneYearGoal: string;
  currentReality: string;
  gap: string;
}

interface RoleDreamStepProps {
  roleCategory: RoleCategory;
  value: DreamData;
  onChange: (data: DreamData) => void;
}

export function RoleDreamStep({ roleCategory, value, onChange }: RoleDreamStepProps) {
  const colors = ROLE_CATEGORY_COLORS[roleCategory];

  function update(key: keyof DreamData, val: string) {
    onChange({ ...value, [key]: val });
  }

  const fields: {
    key: keyof DreamData;
    label: string;
    placeholder: string;
    hint: string;
  }[] = [
    {
      key: "dream",
      label: "Dream — どんな自分になりたいですか？",
      placeholder: "例：海外にも届く作品を作る",
      hint: "まずは一言でOK",
    },
    {
      key: "threeYearGoal",
      label: "3年後どうなっていたいか",
      placeholder: "例：3枚のアルバムをリリースしている",
      hint: "短文でOK",
    },
    {
      key: "oneYearGoal",
      label: "1年後どうなっていたいか",
      placeholder: "例：2曲以上リリース、SNSフォロワー1000人",
      hint: "短文でOK",
    },
    {
      key: "currentReality",
      label: "今の現在地",
      placeholder: "例：制作はしているが、発信・リリース・ライブ導線が弱い",
      hint: "正直に",
    },
    {
      key: "gap",
      label: "今一番足りないもの",
      placeholder: "例：発信する習慣、リリース導線、ライブ経験",
      hint: "キーワードでもOK",
    },
  ];

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
          {ROLE_NAMES[roleCategory]}
        </div>
        <h2 className="text-xl font-medium text-charcoal leading-tight">
          {ROLE_NAMES[roleCategory]}として、<br />
          どんな自分になりたいですか？
        </h2>
        <p className="text-sm text-muted-foreground">
          未入力でも後から編集できます。短文でOKです。
        </p>
      </div>

      {/* 入力フィールド */}
      <div className="space-y-4">
        {fields.map((field, i) => (
          <motion.div
            key={field.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="bg-white rounded-3xl p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <label className="text-sm font-medium text-charcoal">
                {field.label}
              </label>
              <span className="text-xs text-muted-foreground ml-2 shrink-0">
                {field.hint}
              </span>
            </div>
            <textarea
              value={value[field.key]}
              onChange={(e) => update(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={2}
              className="w-full text-sm text-charcoal placeholder:text-muted-foreground/60 focus:outline-none resize-none leading-relaxed"
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
