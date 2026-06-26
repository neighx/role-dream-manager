"use client";

import { motion } from "framer-motion";
import { CalendarEvent, PetType, ROLE_CATEGORY_COLORS } from "@/types";
import { startOfWeek } from "date-fns";
import { calcWeekInsights, formatMinutes } from "@/lib/calendar/calendarUtils";

interface RoleTimeInsightProps {
  events: CalendarEvent[];
  currentDate: Date;
  petType?: PetType;
}

export function RoleTimeInsight({ events, currentDate, petType = "cat" }: RoleTimeInsightProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const insights = calcWeekInsights(events, weekStart);

  if (insights.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-5 text-center">
        <p className="text-xs text-muted-foreground">
          今週はまだ予定がありません。<br />夢に近づく予定を入れましょう。
        </p>
      </div>
    );
  }

  const maxMinutes = Math.max(...insights.map((i) => i.totalMinutes));

  // インサイトメッセージ生成（ルールベース）
  function buildInsightMessage(): string {
    const topRole = insights[0];
    const total = insights.reduce((s, i) => s + i.totalMinutes, 0);

    if (total < 60) {
      return "今週はまだ夢に向かう時間が少ないよ。小さい予定でいいから1つ入れてみよう。";
    }

    if (insights.length === 1) {
      return `今週は${topRole.label}に集中しているね。他のRoleとのバランスも意識してみよう。`;
    }

    return `今週は${topRole.label}に一番時間を使っているよ。夢に直結する時間が入ってるね。`;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl p-5 space-y-4"
    >
      <h3 className="text-sm font-medium text-charcoal">今週のRole時間</h3>

      {/* バーグラフ */}
      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div key={insight.category} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-charcoal">{insight.label}</span>
              <span className="text-xs text-muted-foreground">{formatMinutes(insight.totalMinutes)}</span>
            </div>
            <div className="h-2 bg-mist rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(insight.totalMinutes / maxMinutes) * 100}%` }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="h-full rounded-full"
                style={{ backgroundColor: insight.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* メッセージ */}
      <div className="flex items-start gap-2.5 pt-1 border-t border-mist">
        <span className="text-xl shrink-0">
          {petType === "cat" ? "🐱" : petType === "dog" ? "🐶" : "🤖"}
        </span>
        <p className="text-xs text-charcoal leading-relaxed">
          {buildInsightMessage()}
        </p>
      </div>
    </motion.div>
  );
}
