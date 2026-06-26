"use client";

import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";

interface OnboardingLayoutProps {
  children: React.ReactNode;
  step: number;
  totalSteps: number;
  onBack?: () => void;
  onSkip?: () => void;
  ctaLabel?: string;
  onCTA?: () => void;
  ctaDisabled?: boolean;
  showSkip?: boolean;
  hideBack?: boolean;
}

export function OnboardingLayout({
  children,
  step,
  totalSteps,
  onBack,
  onSkip,
  ctaLabel = "次へ",
  onCTA,
  ctaDisabled = false,
  showSkip = true,
  hideBack = false,
}: OnboardingLayoutProps) {
  const progress = ((step - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="min-h-screen bg-ivory flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 pt-safe pt-4 pb-3">
        {!hideBack ? (
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-mist transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-charcoal/60" />
          </button>
        ) : (
          <div className="w-10" />
        )}

        {/* 進捗バー */}
        <div className="flex-1 mx-4 h-1 bg-mist rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-sage rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />
        </div>

        {showSkip ? (
          <button
            onClick={onSkip}
            className="text-sm text-muted-foreground px-1"
          >
            スキップ
          </button>
        ) : (
          <div className="w-12" />
        )}
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>

      {/* 下部CTA */}
      <div className="px-5 pb-safe pb-8 pt-4">
        <motion.button
          onClick={onCTA}
          disabled={ctaDisabled}
          whileTap={{ scale: ctaDisabled ? 1 : 0.97 }}
          className="w-full py-5 rounded-3xl bg-sage text-white font-medium text-base disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          {ctaLabel}
        </motion.button>
      </div>
    </div>
  );
}
