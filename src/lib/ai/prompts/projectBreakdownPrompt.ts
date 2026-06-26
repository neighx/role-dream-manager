export const PROJECT_BREAKDOWN_PROMPT_VERSION = "v1";

export function buildProjectBreakdownPrompt(params: {
  projectTitle: string;
  projectType: string;
  targetDate: string;
  goal?: string;
  successMetric?: string;
  budget?: number;
  revenueGoal?: number;
  currentState?: string;
  missingInfo?: string;
  priorityFocus?: string;
  roleTitle?: string;
  roleDream?: string;
  todayDate: string;
}): string {
  const daysUntil = Math.ceil(
    (new Date(params.targetDate).getTime() - new Date(params.todayDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  return `あなたはプロジェクトマネージャーとライフコーチを兼ねるAIです。
ユーザーのプロジェクトを締切から逆算して、具体的なタスクとスケジュールに分解してください。

## プロジェクト情報
- タイトル: ${params.projectTitle}
- 種類: ${params.projectType}
- 締切: ${params.targetDate}（今日から${daysUntil}日後）
- 今日: ${params.todayDate}
${params.roleTitle ? `- 関連Role: ${params.roleTitle}` : ""}
${params.roleDream ? `- Roleの夢: ${params.roleDream}` : ""}
${params.goal ? `- 目的: ${params.goal}` : ""}
${params.successMetric ? `- 成功条件: ${params.successMetric}` : ""}
${params.budget ? `- 予算: ${params.budget}円` : ""}
${params.revenueGoal ? `- 売上目標: ${params.revenueGoal}円` : ""}
${params.currentState ? `- 現在決まっていること: ${params.currentState}` : ""}
${params.missingInfo ? `- まだ決まっていないこと: ${params.missingInfo}` : ""}
${params.priorityFocus ? `- 優先したいこと: ${params.priorityFocus}` : ""}

## 指示
締切から逆算して、今日から始められる具体的なタスクリストを作成してください。
- タスクは実行可能な単位に分解する（1タスク = 1アクション）
- 締切に向けて時間的に適切な順序で配置する
- イベント系なら告知・集客・準備・当日・振り返りの流れで
- 各タスクの所要時間は現実的に（15〜120分）
- 今日すぐできる「最初の一歩」を必ず含める
- まだ決まっていないことへの質問を2〜3個含める

以下のJSON形式のみで返してください（説明文は不要）：

{
  "project_title": "${params.projectTitle}",
  "project_type": "${params.projectType}",
  "target_date": "${params.targetDate}",
  "summary": "このProjectを達成するための道筋（1〜2文）",
  "success_metrics": ["成功条件1", "成功条件2"],
  "missing_info_questions": ["質問1", "質問2"],
  "tasks": [
    {
      "title": "タスク名",
      "description": "具体的な内容",
      "due_date": "YYYY-MM-DD",
      "estimated_minutes": 30,
      "importance": "high",
      "urgency": "medium",
      "quadrant": 2,
      "should_schedule": false,
      "suggested_start_time": null,
      "suggested_end_time": null,
      "reason": "なぜこのタイミングか",
      "dependency": null
    }
  ],
  "today_first_action": {
    "title": "今日の最初の一歩",
    "estimated_minutes": 15,
    "reason": "今日やる理由"
  }
}`;
}
