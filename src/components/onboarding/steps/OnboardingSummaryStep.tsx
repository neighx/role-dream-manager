"use client";

import { motion } from "framer-motion";
import { RoleCategory, PetType, ROLE_CATEGORY_COLORS } from "@/types";

const ROLE_NAMES: Record<RoleCategory, string> = {
  creator: "クリエイター",
  health: "健康・スポーツ",
  work: "仕事・ビジネス",
  relationship: "恋愛・人間関係",
  learning: "学び・未来",
  selfcare: "自分のケア",
};

const ROLE_EMOJI: Record<RoleCategory, string> = {
  creator: "🎵",
  health: "🌿",
  work: "💼",
  relationship: "💛",
  learning: "🌍",
  selfcare: "🕯",
};

const PET_INFO: Record<PetType, { name: string; emoji: string }> = {
  cat: { name: "秘書ネコ", emoji: "🐱" },
  dog: { name: "秘書犬", emoji: "🐶" },
  robot: { name: "秘書ロボ", emoji: "🤖" },
};

interface OnboardingSummaryStepProps {
  selectedRoles: RoleCategory[];
  roleValues: Record<RoleCategory, string[]>;
  selectedPet: PetType | null;
}

function buildSummaryMessage(roles: RoleCategory[]): string {
  const roleLabels = roles.map((r) => ROLE_NAMES[r]);
  const joined =
    roleLabels.length <= 1
      ? roleLabels[0] || ""
      : roleLabels.slice(0, -1).join("・") + "・" + roleLabels[roleLabels.length - 1];
  return `あなたにとって今大切なのは、${joined}です。今日の自分に合わせて、少しずつ夢を進めていきましょう。`;
}

export function OnboardingSummaryStep({
  selectedRoles,
  roleValues,
  selectedPet,
}: OnboardingSummaryStepProps) {
  const pet = selectedPet ? PET_INFO[selectedPet] : null;
  const summaryMessage = buildSummaryMessage(selectedRoles);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* タイトル */}
      <div className="text-center space-y-2 pt-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-sage/20 text-4xl mb-2"
        >
          ✦
        </motion.div>
        <h2 className="text-2xl font-medium text-charcoal">
          あなたのRole Board
          <br />
          ができました
        </h2>
      </div>

      {/* Roleサマリー */}
      <div className="space-y-3">
        {selectedRoles.map((role, i) => {
          const colors = ROLE_CATEGORY_COLORS[role];
          const values = roleValues[role] || [];

          return (
            <motion.div
              key={role}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className="bg-white rounded-3xl p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: colors.bg }}
                >
                  {ROLE_EMOJI[role]}
                </div>
                <div>
                  <p className="font-medium text-charcoal text-sm">
                    {ROLE_NAMES[role]}
                  </p>
                </div>
              </div>

              {values.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {values.map((v) => (
                    <span
                      key={v}
                      className="text-xs px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                      }}
                    >
                      {v}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ペット */}
      {pet && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-3xl p-5 flex items-center gap-4"
        >
          <span className="text-3xl">{pet.emoji}</span>
          <div>
            <p className="text-xs text-muted-foreground">あなたの秘書</p>
            <p className="font-medium text-charcoal">{pet.name}</p>
          </div>
        </motion.div>
      )}

      {/* メッセージ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="bg-sage/10 rounded-3xl p-5"
      >
        <p className="text-sm text-charcoal leading-relaxed">
          {summaryMessage}
        </p>
      </motion.div>
    </motion.div>
  );
}
