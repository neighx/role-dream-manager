import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getAIProvider, isAIConfigured } from "@/lib/ai/aiClient";
import { logAICall } from "@/lib/ai/logAI";

export const dynamic = "force-dynamic";

const CATEGORY_JP: Record<string, string> = {
  creator: "クリエイター・表現",
  health: "健康・身体",
  work: "仕事・キャリア",
  relationship: "人間関係",
  learning: "学び・成長",
  selfcare: "セルフケア・精神",
};

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { roleId } = await req.json();
  if (!roleId) return NextResponse.json({ error: "roleId required" }, { status: 400 });

  const { data: role } = await supabase
    .from("roles")
    .select("*")
    .eq("id", roleId)
    .eq("user_id", user.id)
    .single();

  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  if (!isAIConfigured()) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const categoryJp = CATEGORY_JP[role.category] ?? role.category;
  const valuesStr = role.values?.length ? role.values.join("、") : "なし";
  const dreamStr = role.dream ?? "（未設定）";
  const realityStr = role.current_reality ?? "（未設定）";
  const gapStr = role.gap ?? "（未設定）";

  const prompt = `あなたはライフコーチ兼目標設計の専門家です。
ユーザーの夢・現状・ギャップを踏まえて、逆算した目標ロードマップを日本語で提案してください。

## ユーザー情報
- Roleカテゴリ: ${categoryJp}
- Role名: ${role.title}
- 大切にしたいこと（価値観）: ${valuesStr}

## Dream Gap Analysis
- 夢・理想: ${dreamStr}
- 現在地: ${realityStr}
- ギャップ・課題: ${gapStr}

## 指示
夢を実現するための道筋を、以下の5つの時間軸で具体的に提案してください。
各目標は**行動ベース**で書き、「〜する」「〜になる」「〜を達成する」など動詞で締めてください。
抽象的すぎず、かつ具体的すぎず、本人が「そうそれ！」と感じるような提案を心がけてください。
今週・今月は特に具体的に、3年はビジョン的に書いてください。

## 出力形式（JSONのみ。説明文不要）
{
  "three_year_goal": "3年後の状態（1〜2文）",
  "one_year_goal": "1年後に達成していること（1〜2文）",
  "three_month_goal": "3ヶ月以内に完了させること（1文）",
  "monthly_goal": "今月中にやること（1文）",
  "weekly_goal": "今週中にやること（1文）"
}`;

  const ai = getAIProvider();
  const result = await ai.generate({
    messages: [{ role: "user", content: prompt }],
    maxTokens: 800,
    temperature: 0.7,
  });

  // JSON抽出
  const raw = result.content.trim();
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "AI response parse failed" }, { status: 500 });
  }

  let roadmap: Record<string, string>;
  try {
    roadmap = JSON.parse(jsonMatch[0]);
  } catch {
    return NextResponse.json({ error: "AI response JSON invalid" }, { status: 500 });
  }

  await logAICall(supabase, user.id, {
    feature: "roadmap",
    model: result.model,
    promptVersion: process.env.ROADMAP_PROMPT_VERSION ?? "v1",
    resultSummary: Object.values(roadmap).join(" / ").slice(0, 500),
  });

  return NextResponse.json({ roadmap });
}
