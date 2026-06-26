"use client";

import { motion } from "framer-motion";
import { ImagePlus, X } from "lucide-react";
import { useState, useRef } from "react";
import { RoleCategory, ROLE_CATEGORY_COLORS } from "@/types";

const ROLE_NAMES: Record<RoleCategory, string> = {
  creator: "クリエイター",
  health: "健康・スポーツ",
  work: "仕事・ビジネス",
  relationship: "恋愛・人間関係",
  learning: "学び・未来",
  selfcare: "自分のケア",
};

interface VisionPhotoStepProps {
  roleCategory: RoleCategory;
  value: File | null;
  onChange: (file: File | null) => void;
}

export function VisionPhotoStep({ roleCategory, value, onChange }: VisionPhotoStepProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const colors = ROLE_CATEGORY_COLORS[roleCategory];

  function handleFile(file: File) {
    onChange(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  function handleRemove() {
    onChange(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
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
          {ROLE_NAMES[roleCategory]}
        </div>
        <h2 className="text-xl font-medium text-charcoal leading-tight">
          理想の自分を
          <br />
          写真で表してください
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          理想の自分、理想の場所、理想の作品の写真を<br />
          貼ってください。後からでも設定できます。
        </p>
      </div>

      {/* アップロードカード */}
      <div className="relative">
        {preview ? (
          <div className="relative rounded-3xl overflow-hidden aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Vision"
              className="w-full h-full object-cover"
            />
            <button
              onClick={handleRemove}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full aspect-square rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all hover:border-sage/50"
            style={{ borderColor: colors.border, backgroundColor: colors.bg + "20" }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: colors.bg }}
            >
              <ImagePlus className="w-7 h-7" style={{ color: colors.text }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-charcoal">写真を追加</p>
              <p className="text-xs text-muted-foreground mt-1">
                タップして選択
              </p>
            </div>
          </button>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {/* スキップヒント */}
      <p className="text-center text-xs text-muted-foreground">
        あとからRoleの詳細画面で設定できます
      </p>
    </motion.div>
  );
}
