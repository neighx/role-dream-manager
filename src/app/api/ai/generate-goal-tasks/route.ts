import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider, isAIConfigured } from "@/lib/ai/aiClient";
import { format, differenceInDays } from "date-fns";
import { ja } from "date-fns/locale";

export const dynamic = "force-dynamic";

type GoalCategory = "music_event" | "release" | "collab" | "other";

const CATEGORY_LABELS: Record<GoalCategory, string> = {
  music_event: "音楽イベント",
  release: "CDリリース",
  collab: "コラボ企画",
  other: "その他",
};

function daysBeforeEvent(eventDate: Date, n: number): string {
  const d = new Date(eventDate);
  d.setDate(d.getDate() - Math.max(n, 0));
  return format(d, "yyyy-MM-dd");
}

function ruleBasedTasks(category: GoalCategory, eventDate: Date): Array<{ title: string; due_date: string }> {
  const days = Math.max(differenceInDays(eventDate, new Date()), 7);

  const templates: Record<GoalCategory, Array<{ title: string; offset: number }>> = {
    music_event: [
      { title: "会場を仮予約する",           offset: Math.round(days * 0.85) },
      { title: "出演者にブッキング連絡",      offset: Math.round(days * 0.70) },
      { title: "フライヤー情報をまとめる",    offset: Math.round(days * 0.55) },
      { title: "デザイナーに発注・入稿",      offset: Math.round(days * 0.40) },
      { title: "SNS告知をスタートする",       offset: Math.round(days * 0.28) },
      { title: "タイムテーブルを確定する",    offset: Math.round(days * 0.18) },
      { title: "機材・PAと最終確認",          offset: Math.round(days * 0.08) },
      { title: "当日スタッフに最終連絡",      offset: 1 },
    ],
    release: [
      { title: "ミックス・マスタリング発注",  offset: Math.round(days * 0.80) },
      { title: "ジャケットデザイン発注",      offset: Math.round(days * 0.65) },
      { title: "ディストリビューター登録",    offset: Math.round(days * 0.50) },
      { title: "プレスリリース作成",          offset: Math.round(days * 0.38) },
      { title: "SNS事前告知スタート",         offset: Math.round(days * 0.25) },
      { title: "各プラットフォーム確認",      offset: Math.round(days * 0.10) },
      { title: "当日投稿スケジュール作成",    offset: 2 },
    ],
    collab: [
      { title: "相手に正式打診・条件確認",    offset: Math.round(days * 0.85) },
      { title: "コンセプト・方向性を共有",    offset: Math.round(days * 0.70) },
      { title: "スケジュール・役割分担確定",  offset: Math.round(days * 0.55) },
      { title: "制作物の第一稿を提出",        offset: Math.round(days * 0.40) },
      { title: "中間確認・フィードバック",    offset: Math.round(days * 0.25) },
      { title: "完成物の最終確認・修正",      offset: Math.round(days * 0.10) },
      { title: "告知・公開準備完了",          offset: 2 },
    ],
    other: [
      { title: "詳細計画を立てる",            offset: Math.round(days * 0.90) },
      { title: "必要なリソースを洗い出す",    offset: Math.round(days * 0.75) },
      { title: "第一フェーズを完了させる",    offset: Math.round(days * 0.60) },
      { title: "中間チェック・見直し",        offset: Math.round(days * 0.42) },
      { title: "第二フェーズを完了させる",    offset: Math.round(days * 0.25) },
      { title: "最終調整・品質確認",          offset: Math.round(days * 0.10) },
      { title: "完了・振り返り",              offset: 1 },
    ],
  };

  return (templates[category] || templates.other).map((t) => ({
    title: t.title,
    due_date: daysBeforeEvent(eventDate, t.offset),
  }));
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, category, event_date } = (await req.json()) as {
    title: string;
    category: GoalCategory;
    event_date: string;
  };

  if (!title || !event_date) {
    return NextResponse.json({ error: "title and event_date are required" }, { status: 400 });
  }

  const eventDate = new Date(event_date + "T00:00:00");
  const today = new Date();
  const daysUntil = differenceInDays(eventDate, today);
  const categoryLabel = CATEGORY_LABELS[category] ?? "その他";

  if (!isAIConfigured() || daysUntil <= 1) {
    return NextResponse.json({ tasks: ruleBasedTasks(category, eventDate) });
  }

  const prompt = `あなたはクリエイターのプロマネージャーAIです。
以下のゴールを達成するためのタスクを、イベント日から逆算して具体的に生成してください。

ゴール名: ${title}
カテゴリ: ${categoryLabel}
イベント日: ${format(eventDate, "yyyy年M月d日（E）", { locale: ja })}（今日から${daysUntil}日後）
今日の日付: ${format(today, "yyyy年M月d日", { locale: ja })}

条件:
- タスク件数: 6〜8件
- 各タスク: 具体的なアクション（動詞で始める、20文字以内）
- due_dateはイベント日より前、早い順（昇順）に並べる
- カテゴリが音楽イベントなら: 会場予約、ブッキング、フライヤー、告知、タイムテーブル、機材確認 を含める

JSON配列のみ出力。説明文・前置きは不要:
[{"title":"タスク名","due_date":"yyyy-MM-dd"},...]`;

  try {
    const ai = getAIProvider();
    const result = await ai.generate({
      messages: [{ role: "user", content: prompt }],
      maxTokens: 600,
      temperature: 0.25,
    });

    const jsonMatch = result.content.trim().match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("JSON not found");

    const tasks = JSON.parse(jsonMatch[0]) as Array<{ title: string; due_date: string }>;
    return NextResponse.json({ tasks });
  } catch (e) {
    console.error("AI goal task generation failed:", e);
    return NextResponse.json({ tasks: ruleBasedTasks(category, eventDate) });
  }
}
