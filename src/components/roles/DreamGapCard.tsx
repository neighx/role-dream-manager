"use client";

import { motion } from "framer-motion";
import { Role, ROLE_CATEGORY_COLORS } from "@/types";
import { ArrowRight } from "lucide-react";

interface DreamGapCardProps {
  role: Role;
  compact?: boolean;
}

export function DreamGapCard({ role, compact = false }: DreamGapCardProps) {
  const colors = ROLE_CATEGORY_COLORS[role.category];

  if (compact) {
    return (
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: colors.border + "60" }}>
        <div className="grid grid-cols-2 divide-x" style={{ borderColor: colors.border + "60" }}>
          {role.current_reality && (
            <div className="p-3" style={{ backgroundColor: colors.bg + "30" }}>
              <p className="text-[10px] font-medium mb-1" style={{ color: colors.text }}>現在地</p>
              <p className="text-xs text-charcoal leading-relaxed line-clamp-2">
                {role.current_reality}
              </p>
            </div>
          )}
          {role.gap && (
            <div className="p-3">
              <p className="text-[10px] font-medium text-muted-foreground mb-1">Gap</p>
              <p className="text-xs text-charcoal leading-relaxed line-clamp-2">
                {role.gap}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Dream → Current Reality → Gap の流れ */}
      <div className="bg-white rounded-3xl p-5 space-y-4">
        <h3 className="text-sm font-medium text-charcoal">Dream Gap Analysis</h3>

        {/* Dream */}
        {role.dream && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: colors.text }}>Dream</span>
              <div className="flex-1 h-px" style={{ backgroundColor: colors.border + "40" }} />
            </div>
            <p className="text-sm text-charcoal leading-relaxed">{role.dream}</p>
          </div>
        )}

        {/* ↓ Arrow */}
        {role.current_reality && (
          <div className="flex justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground rotate-90" />
          </div>
        )}

        {/* Current Reality */}
        {role.current_reality && (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">現在地</span>
              <div className="flex-1 h-px bg-mist" />
            </div>
            <p className="text-sm text-charcoal leading-relaxed">{role.current_reality}</p>
          </div>
        )}

        {/* Gap */}
        {role.gap && (
          <div
            className="rounded-2xl p-3 space-y-1"
            style={{ backgroundColor: colors.bg + "40" }}
          >
            <p className="text-xs font-medium" style={{ color: colors.text }}>Gap（埋めるべきもの）</p>
            <p className="text-sm text-charcoal leading-relaxed">{role.gap}</p>
          </div>
        )}

        {/* Next Focus */}
        {role.next_focus && (
          <div className="flex items-start gap-2.5 pt-1">
            <div
              className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
              style={{ backgroundColor: colors.text }}
            />
            <div>
              <p className="text-xs text-muted-foreground">Next Focus</p>
              <p className="text-sm text-charcoal leading-relaxed">{role.next_focus}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
