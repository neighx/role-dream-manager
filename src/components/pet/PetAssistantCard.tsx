"use client";

import { motion } from "framer-motion";
import { PetType } from "@/types";

const PET_CONFIG: Record<
  PetType,
  { emoji: string; name: string; bg: string; textColor: string }
> = {
  cat: { emoji: "🐱", name: "秘書ネコ", bg: "#EDD5CC", textColor: "#9B5A4E" },
  dog: { emoji: "🐶", name: "秘書犬", bg: "#C8DBC6", textColor: "#3A6B36" },
  robot: { emoji: "🤖", name: "秘書ロボ", bg: "#BDD5EA", textColor: "#2A5F8F" },
};

interface PetAssistantCardProps {
  petType: PetType;
  message: string;
  className?: string;
}

export function PetAssistantCard({ petType, message, className = "" }: PetAssistantCardProps) {
  const config = PET_CONFIG[petType];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`flex items-start gap-3 ${className}`}
    >
      {/* アバター */}
      <div
        className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
        style={{ backgroundColor: config.bg }}
      >
        {config.emoji}
      </div>

      {/* 吹き出し */}
      <div className="flex-1">
        <p className="text-xs mb-1.5" style={{ color: config.textColor }}>
          {config.name}
        </p>
        <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          <p className="text-sm text-charcoal leading-relaxed">{message}</p>
        </div>
      </div>
    </motion.div>
  );
}
