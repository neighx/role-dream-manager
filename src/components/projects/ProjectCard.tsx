"use client";
import { motion } from "framer-motion";
import { ChevronRight, Calendar } from "lucide-react";
import { Project, ROLE_CATEGORY_COLORS, RoleCategory } from "@/types";
import { format, differenceInDays } from "date-fns";
import { ja } from "date-fns/locale";

interface Props {
  project: Project;
  roleCategory?: RoleCategory;
  onClick: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  planning: "計画中",
  active: "進行中",
  completed: "完了",
  paused: "一時停止",
  archived: "アーカイブ",
};

const TYPE_LABELS: Record<string, string> = {
  event: "🎪 イベント",
  release: "🎵 リリース",
  health: "🌿 健康",
  learning: "🌍 学び",
  business: "💼 ビジネス",
  custom: "✦ カスタム",
};

export function ProjectCard({ project, roleCategory, onClick }: Props) {
  const colors = roleCategory
    ? ROLE_CATEGORY_COLORS[roleCategory] ?? ROLE_CATEGORY_COLORS.creator
    : ROLE_CATEGORY_COLORS.creator;
  const daysLeft = project.target_date
    ? differenceInDays(new Date(project.target_date), new Date())
    : null;

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-border"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs" style={{ color: colors.text }}>
              {TYPE_LABELS[project.project_type] ?? "✦"}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: colors.bg, color: colors.text }}
            >
              {STATUS_LABELS[project.status]}
            </span>
          </div>
          <p className="font-medium text-sm text-charcoal truncate">{project.title}</p>
          {project.target_date && (
            <div className="flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {format(new Date(project.target_date), "M月d日", { locale: ja })}
                {daysLeft !== null && (
                  <span
                    className={daysLeft <= 7 ? "text-red-500 ml-1 font-medium" : "ml-1"}
                  >
                    （あと{daysLeft}日）
                  </span>
                )}
              </span>
            </div>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
      </div>
      <div className="mt-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-muted-foreground">進捗</span>
          <span className="text-xs font-medium text-charcoal">{project.progress}%</span>
        </div>
        <div className="h-1 bg-mist rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${project.progress}%`, backgroundColor: colors.border }}
          />
        </div>
      </div>
    </motion.button>
  );
}
