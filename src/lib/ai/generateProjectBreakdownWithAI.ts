import { getAIProvider } from "./aiClient";
import { buildProjectBreakdownPrompt } from "./prompts/projectBreakdownPrompt";
import { AIProjectBreakdown, AIProjectTask, Project, ProjectType, Role, TaskImportance } from "@/types";
import { format } from "date-fns";

export async function generateProjectBreakdownWithAI(
  project: Partial<Project>,
  role: Role | null,
): Promise<AIProjectBreakdown> {
  const todayDate = format(new Date(), "yyyy-MM-dd");

  const prompt = buildProjectBreakdownPrompt({
    projectTitle: project.title ?? "",
    projectType: project.project_type ?? "custom",
    targetDate: project.target_date ?? todayDate,
    goal: project.goal ?? undefined,
    successMetric: project.success_metric ?? undefined,
    budget: project.budget ?? undefined,
    revenueGoal: project.revenue_goal ?? undefined,
    currentState: project.current_state ?? undefined,
    missingInfo: project.missing_info ?? undefined,
    priorityFocus: project.priority_focus ?? undefined,
    roleTitle: role?.title ?? undefined,
    roleDream: role?.dream ?? undefined,
    todayDate,
  });

  const ai = getAIProvider();
  const result = await ai.generate({
    messages: [{ role: "user", content: prompt }],
    maxTokens: 2000,
    temperature: 0.7,
  });

  const jsonMatch = result.content.trim().match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI response parse failed");

  return JSON.parse(jsonMatch[0]) as AIProjectBreakdown;
}

export function ruleBasedProjectBreakdown(project: Partial<Project>): AIProjectBreakdown {
  const today = new Date();
  const target = project.target_date
    ? new Date(project.target_date)
    : new Date(today.getTime() + 30 * 86400000);
  const daysLeft = Math.ceil((target.getTime() - today.getTime()) / 86400000);

  function addDays(d: Date, n: number): string {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return format(r, "yyyy-MM-dd");
  }

  const tasks: AIProjectTask[] = [
    {
      title: "プロジェクトのゴールと成功条件を書き出す",
      description: "何を達成すれば成功か明確にする",
      due_date: addDays(today, 1),
      estimated_minutes: 30,
      importance: "high" as TaskImportance,
      urgency: "high" as TaskImportance,
      quadrant: 1,
      should_schedule: false,
      suggested_start_time: null,
      suggested_end_time: null,
      reason: "最初に方向性を決める",
      dependency: null,
    },
    {
      title: "必要なリソースと人をリストアップする",
      description: "人・もの・お金・時間を整理",
      due_date: addDays(today, 2),
      estimated_minutes: 45,
      importance: "high" as TaskImportance,
      urgency: "medium" as TaskImportance,
      quadrant: 2,
      should_schedule: false,
      suggested_start_time: null,
      suggested_end_time: null,
      reason: "準備に必要なものを把握する",
      dependency: null,
    },
    {
      title: "中間マイルストーンを3つ設定する",
      description: `締切まで${daysLeft}日。途中チェックポイントを作る`,
      due_date: addDays(today, 3),
      estimated_minutes: 30,
      importance: "high" as TaskImportance,
      urgency: "medium" as TaskImportance,
      quadrant: 2,
      should_schedule: false,
      suggested_start_time: null,
      suggested_end_time: null,
      reason: "進捗管理のため",
      dependency: null,
    },
    {
      title: "最初のアクションを実行する",
      description: "一番小さい具体的な行動を今日やる",
      due_date: format(today, "yyyy-MM-dd"),
      estimated_minutes: 20,
      importance: "high" as TaskImportance,
      urgency: "high" as TaskImportance,
      quadrant: 1,
      should_schedule: false,
      suggested_start_time: null,
      suggested_end_time: null,
      reason: "動き始めることが一番大切",
      dependency: null,
    },
  ];

  return {
    project_title: project.title ?? "プロジェクト",
    project_type: (project.project_type ?? "custom") as ProjectType,
    target_date: format(target, "yyyy-MM-dd"),
    summary: `このProjectを達成するための道筋を作りました。締切まで${daysLeft}日なので、今週中に基礎固めを終わらせましょう。`,
    success_metrics: [project.success_metric ?? "目標を達成する"],
    missing_info_questions: [
      "具体的な成功条件は何ですか？",
      "誰かの協力が必要ですか？",
      "予算や使えるリソースは？",
    ],
    tasks,
    today_first_action: {
      title: "プロジェクトのゴールを1枚の紙に書き出す",
      estimated_minutes: 15,
      reason: "まず全体像を言語化することで、次のアクションが明確になります",
    },
  };
}
