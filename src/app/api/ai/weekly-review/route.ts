import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getAIProvider, isAIConfigured } from "@/lib/ai/aiClient";
import { logAICall } from "@/lib/ai/logAI";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { ja } from "date-fns/locale";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isAIConfigured()) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  // 今週のデータを取得
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  const [{ data: roles }, { data: tasks }, { data: checkins }, { data: profile }] = await Promise.all([
    supabase.from("roles").select("id,title,category,dream,weekly_goal,monthly_goal").eq("user_id", user.id),
    supabase.from("tasks").select("id,title,status,role_id,estimated_minutes").eq("user_id", user.id)
      .gte("created_at", weekStartStr).lte("created_at", weekEndStr + "T23:59:59"),
    supabase.from("daily_checkins").select("date,mood,energy,mode,stress_cause").eq("user_id", user.id)
      .gte("date", weekStartStr).lte("date", weekEndStr),
    supabase.from("users_profile").select("name,life_vision").eq("user_id", user.id).single(),
  ]);

  // roleMap reserved for future use

  const doneCount = (tasks || []).filter((t: any) => t.status === "done").length;
  const totalCount = (tasks || []).length;

  // Roleごとのサマリー
  const roleSummary = (roles || []).map((role: any) => {
    const roleTasks = (tasks || []).filter((t: any) => t.role_id === role.id);
    return {
      name: role.title,
      dream: role.dream || null,
      weeklyGoal: role.weekly_goal || null,
      monthlyGoal: role.monthly_goal || null,
      total: roleTasks.length,
      done: roleTasks.filter((t: any) => t.status === "done").length,
    };
  });

  // 感情サマリー
  const avgEnergy = (checkins || []).length > 0
    ? Math.round((checkins || []).reduce((s: number, c: any) => s + c.energy, 0) / (checkins || []).length)
    : null;

  const checkinDays = (checkins || []).map((c: any) =>
    `${format(new Date(c.date), "E", { locale: ja })}曜: エネルギー${c.energy}% (${c.mode})`
  ).join(", ");

  const roleLines = roleSummary.map((r) => {
    let line = `- ${r.name}: ${r.total}件中${r.done}件完了`;
    if (r.weeklyGoal) line += ` / 週目標「${r.weeklyGoal}」`;
    return line;
  }).join("\n");

  const prompt = `あなたはユーザーの人生の夢と目標を深く理解しているライフコーチです。
今週のデータをもとに、温かく具体的な週次振り返りを日本語で生成してください。

## ユーザー情報
- 名前: ${profile?.name || "あなた"}
- ライフビジョン: ${profile?.life_vision || "未設定"}

## 今週（${format(weekStart, "M/d")}〜${format(weekEnd, "M/d")}）の実績
- 完了TODO: ${doneCount}件 / 合計${totalCount}件
- チェックイン回数: ${(checkins || []).length}日
- 平均エネルギー: ${avgEnergy ?? "データなし"}%

## Roleごとの活動
${roleLines || "（活動記録なし）"}

## 感情・エネルギーの推移
${checkinDays || "（チェックインなし）"}

## 指示
以下のJSONで振り返りを出力してください。
- reflection: 今週全体への温かいコメント（2〜3文）
- wins: よかった点（配列、1〜3件、具体的に）
- challenges: 課題・来週改善したい点（配列、1〜2件）
- next_week_focus: 来週特に意識してほしいこと（1〜2文）
- encouragement: 最後に背中を押す一言（短く、力強く）

必ずJSONのみを返してください。

{
  "reflection": "...",
  "wins": ["...", "..."],
  "challenges": ["..."],
  "next_week_focus": "...",
  "encouragement": "..."
}`;

  const ai = getAIProvider();
  const result = await ai.generate({
    messages: [{ role: "user", content: prompt }],
    maxTokens: 800,
    temperature: 0.75,
  });

  const jsonMatch = result.content.trim().match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: "parse failed" }, { status: 500 });

  let review: Record<string, unknown>;
  try {
    review = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({ error: "JSON invalid" }, { status: 500 });
  }

  await logAICall(supabase, user.id, {
    feature: "weekly_review",
    model: result.model,
    promptVersion: "v1",
    resultSummary: String(review.encouragement ?? "").slice(0, 200),
  });

  return NextResponse.json({ review });
}
