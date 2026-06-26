"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { PetType } from "@/types";

interface Pet {
  type: PetType;
  name: string;
  emoji: string;
  personality: string;
  traits: string[];
  color: string;
  bg: string;
}

const PETS: Pet[] = [
  {
    type: "cat",
    name: "秘書ネコ",
    emoji: "🐱",
    personality: "やさしく、感情に寄り添う",
    traits: ["無理させない", "回復モードが得意", "感情を守る"],
    color: "#9B5A4E",
    bg: "#EDD5CC",
  },
  {
    type: "dog",
    name: "秘書犬",
    emoji: "🐶",
    personality: "明るく、行動を後押しする",
    traits: ["締切管理が得意", "達成を一緒に喜ぶ", "背中を押してくれる"],
    color: "#3A6B36",
    bg: "#C8DBC6",
  },
  {
    type: "robot",
    name: "秘書ロボ",
    emoji: "🤖",
    personality: "論理的に、整理してくれる",
    traits: ["優先順位を出す", "冷静に支える", "段取りが得意"],
    color: "#2A5F8F",
    bg: "#BDD5EA",
  },
];

interface PetSelectionStepProps {
  value: PetType | null;
  onChange: (pet: PetType) => void;
}

export function PetSelectionStep({ value, onChange }: PetSelectionStepProps) {
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
          あなたを応援する<br />
          秘書を選んでください
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          毎日のメッセージや提案を届けてくれます。<br />
          後から変更できます。
        </p>
      </div>

      {/* ペットカード */}
      <div className="space-y-4">
        {PETS.map((pet, i) => {
          const isSelected = value === pet.type;

          return (
            <motion.button
              key={pet.type}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onChange(pet.type)}
              className={`w-full text-left rounded-3xl border-2 overflow-hidden transition-all ${
                isSelected
                  ? "border-sage shadow-sm"
                  : "border-transparent shadow-none"
              }`}
            >
              <div
                className="p-5"
                style={
                  isSelected
                    ? { backgroundColor: pet.bg + "60" }
                    : { backgroundColor: "#FFFFFF" }
                }
              >
                <div className="flex items-start gap-4">
                  {/* アイコン */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                    style={{ backgroundColor: pet.bg }}
                  >
                    {pet.emoji}
                  </div>

                  {/* テキスト */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-charcoal text-base">
                        {pet.name}
                      </h3>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 rounded-full bg-sage flex items-center justify-center"
                        >
                          <Check className="w-3.5 h-3.5 text-white" />
                        </motion.div>
                      )}
                    </div>
                    <p
                      className="text-sm mt-0.5"
                      style={{ color: pet.color }}
                    >
                      {pet.personality}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {pet.traits.map((trait) => (
                        <span
                          key={trait}
                          className="text-xs px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: pet.bg,
                            color: pet.color,
                          }}
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
