import {
  GeneratedTodayTask, TodayPlanResult, TodayPlanMeta, Quadrant, RoleCategory,
} from "@/types";
import { getAIProvider } from "./aiClient";
import {
  buildTodayPlanMessages, TodayPlanPromptInput, TODAY_PLAN_PROMPT_VERSION,
} from "./prompts/todayPlanPrompt";

// ─── AI JSON → 内部型への変換 ─────────────────────────────────

type AIDifficulty = "easy" | "normal" | "hard";
type AIImportance = "low" | "medium" | "high";
type AIQuadrant =
  | "important_urgent"
  | "important_not_urgent"
  | "urgent_not_important"
  | "not_important_not_urgent";

const DIFFICULTY_MAP: Record<AIDifficulty, 1 | 2 | 3 | 4 | 5> = {
  easy:   1,
  normal: 3,
  hard:   5,
};

const IMPORTANCE_MAP: Record<AIImportance, 1 | 2 | 3 | 4 | 5> = {
  low:    2,
  medium: 3,
  high:   5,
};

const QUADRANT_MAP: Record<AIQuadrant, Quadrant> = {
  important_urgent:         1,
  important_not_urgent:     2,
  urgent_not_important:     3,
  not_important_not_urgent: 4,
};

// ─── メイン生成関数 ────────────────────────────────────────────

export async function generateTodayPlanWithAI(
  input: TodayPlanPromptInput
): Promise<TodayPlanResult> {
  const provider = getAIProvider();
  const messages = buildTodayPlanMessages(input);

  const result = await provider.generate({
    messages,
    maxTokens: 4096,
    temperature: 0.72,
  });

  // JSON抽出（コードブロックに包まれていた場合も対応）
  let jsonText = result.content.trim();
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonText = fenceMatch[1].trim();

  const aiResponse = JSON.parse(jsonText);

  // plans → GeneratedTodayTask[]
  const tasks: GeneratedTodayTask[] = (aiResponse.plans ?? []).map(
    (plan: Record<string, unknown>, i: number): GeneratedTodayTask => {
      const difficulty = DIFFICULTY_MAP[(plan.difficulty as AIDifficulty) ?? "normal"] ?? 3;
      const importance = IMPORTANCE_MAP[(plan.importance as AIImportance) ?? "medium"] ?? 3;
      const urgency = IMPORTANCE_MAP[(plan.urgency as AIImportance) ?? "medium"] ?? 3;
      const quadrant = QUADRANT_MAP[(plan.quadrant as AIQuadrant) ?? "important_not_urgent"] ?? 2;

      return {
        id: `ai-${plan.role_id}-${i}-${Date.now()}`,
        role_id: plan.role_id as string,
        role_category: plan.role_category as RoleCategory,
        role_title: plan.role_name as string,
        title: plan.task_title as string,
        description: plan.task_description as string | undefined,
        purpose: plan.purpose as string | undefined,
        gap_addressed: (plan.gap_target as string) ?? "",
        gap_target: plan.gap_target as string | undefined,
        related_dream: plan.related_dream as string | undefined,
        related_long_term_goal: plan.related_long_term_goal as string | undefined,
        related_monthly_goal: plan.related_monthly_goal as string | undefined,
        current_reality_reference: plan.current_reality_reference as string | undefined,
        next_focus_reference: plan.next_focus_reference as string | undefined,
        long_term_connection: (plan.related_long_term_goal as string) ?? "",
        today_reason: (plan.today_reason as string) ?? "",
        emotional_adjustment_reason: plan.emotional_adjustment_reason as string | undefined,
        estimated_minutes: (plan.estimated_minutes as number) ?? 30,
        difficulty,
        importance,
        urgency,
        quadrant,
        action_size: plan.action_size as GeneratedTodayTask["action_size"],
        energy_adapted: true,
        stress_adapted: true,
        generated_by: "claude",
        ai_generated: true,
        status: "todo",
        schedule_suggestion: plan.schedule_suggestion as GeneratedTodayTask["schedule_suggestion"],
      };
    }
  );

  const meta: TodayPlanMeta = {
    overall_message: (aiResponse.overall_message as string) ?? "",
    pet_message: (aiResponse.pet_message as string) ?? "",
    emotional_summary: (aiResponse.emotional_summary as string) ?? "",
    available_time_strategy: (aiResponse.available_time_strategy as string) ?? "",
    not_today: (aiResponse.not_today as TodayPlanMeta["not_today"]) ?? [],
    reflection_question: (aiResponse.reflection_question as string) ?? "",
    ai_generated: true,
    ai_model: result.model,
    prompt_version: TODAY_PLAN_PROMPT_VERSION,
  };

  return { tasks, meta };
}
