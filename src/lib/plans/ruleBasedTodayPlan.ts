// 既存のルールベース生成をTodayPlanResultにラップして返す
// lib/plan/generateTodayPlan.ts の generateByRules を再利用
import { DailyCheckin, Role, TodayPlanResult, GeneratedTodayTask, Quadrant } from "@/types";
import { getEnergyConfig } from "@/lib/plan/rules/energyRules";
import { findGapTemplates, selectTask } from "@/lib/plan/rules/gapToTasks";
import { buildTodayReason } from "@/lib/plan/rules/todayReasonBuilder";
import { MODE_LABELS } from "@/types";

export interface RuleBasedInput {
  checkin: DailyCheckin;
  selectedRoles: Role[];
}

export function ruleBasedTodayPlan(
  input: RuleBasedInput,
  fallbackReason?: string
): TodayPlanResult {
  const tasks = generateByRules(input);
  const { checkin } = input;

  const modeLabel = MODE_LABELS[checkin.mode];
  const energyPct = checkin.energy;

  return {
    tasks,
    meta: {
      overall_message: `今日は${modeLabel}（エネルギー${energyPct}%）。できる範囲で夢との線を切らないプランです。`,
      pet_message: getPetMessageByMode(checkin.mode, checkin.energy),
      emotional_summary: `${modeLabel}として、感情に無理のない行動を選びました。`,
      available_time_strategy: `エネルギー${energyPct}%をもとに行動の大きさを調整しています。`,
      not_today: [],
      reflection_question: "今日、夢に一歩近づけましたか？",
      ai_generated: false,
      fallback_reason: fallbackReason,
    },
  };
}

function getPetMessageByMode(mode: string, energy: number): string {
  if (mode === "recover" || energy <= 10) {
    return "無理しなくていいよ。今日は夢との線を切らないだけで十分。";
  }
  if (mode === "protect") {
    return "今日は守る日。小さくていいから、ひとつだけ触れてみて。";
  }
  if (mode === "attack") {
    return "今日はいける日！まず一番大事なことから始めよう。";
  }
  return "今日も一歩ずつ。できることを積み上げていこう。";
}

function generateByRules(input: RuleBasedInput): GeneratedTodayTask[] {
  const { checkin, selectedRoles } = input;
  const { mode, energy, stress_cause, mood } = checkin;

  const config = getEnergyConfig(mode, energy);
  const results: GeneratedTodayTask[] = [];
  const tasksPerRole = Math.max(1, Math.floor(config.maxTasks / selectedRoles.length));

  for (const role of selectedRoles) {
    const gapText = role.gap || "";
    const gapTemplates = findGapTemplates(role.category, gapText);

    let added = 0;
    for (const template of gapTemplates) {
      if (added >= tasksPerRole) break;

      const task = selectTask(template, config.maxMinutes, config.maxDifficulty);

      const todayReason = buildTodayReason({
        mode,
        energy,
        stressCause: stress_cause,
        mood,
        dream: role.dream || undefined,
        monthlyGoal: role.monthly_goal || undefined,
        gapAddressed: template.gapAddressed,
      });

      const longTermConnection = template.longTermConnectionTemplate
        .replace("{one_year_goal}", role.one_year_goal || "1年後の目標")
        .replace("{three_year_goal}", role.three_year_goal || "3年後の夢")
        .replace("{dream}", role.dream || "夢");

      let adjustedTitle = task.title;
      let adjustedDifficulty = task.difficulty as 1 | 2 | 3 | 4 | 5;
      let adjustedMinutes = task.estimatedMinutes;

      if (stress_cause === "perfectionism") {
        adjustedTitle = `ラフでいい、${task.title}`;
        adjustedDifficulty = Math.min(task.difficulty, 2) as 1 | 2;
      }
      if (stress_cause === "time") {
        adjustedMinutes = Math.min(task.estimatedMinutes, 15);
      }
      if (mode === "recover" || energy === 10) {
        adjustedTitle = `夢との接続を切らない：${task.title}`;
        adjustedDifficulty = 1;
        adjustedMinutes = Math.min(task.estimatedMinutes, 5);
      }

      const quadrant = classifyQuadrant(task.importance, task.urgency);

      results.push({
        id: `rule-${role.id}-${template.gapKeyword}-${Date.now()}`,
        role_id: role.id,
        role_category: role.category,
        role_title: role.title,
        title: adjustedTitle,
        gap_addressed: template.gapAddressed,
        long_term_connection: longTermConnection,
        today_reason: todayReason,
        estimated_minutes: adjustedMinutes,
        difficulty: adjustedDifficulty,
        importance: task.importance as 1 | 2 | 3 | 4 | 5,
        urgency: task.urgency as 1 | 2 | 3 | 4 | 5,
        quadrant,
        energy_adapted: mode !== "attack" || energy < 100,
        stress_adapted: stress_cause !== "other",
        generated_by: "rule_based",
        ai_generated: false,
        status: "todo",
      });

      added++;
    }
  }

  return results;
}

function classifyQuadrant(importance: number, urgency: number): Quadrant {
  if (importance >= 4 && urgency >= 4) return 1;
  if (importance >= 4 && urgency < 4)  return 2;
  if (importance < 4 && urgency >= 4)  return 3;
  return 4;
}
