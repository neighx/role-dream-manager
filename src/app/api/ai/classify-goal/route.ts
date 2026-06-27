import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { isAIConfigured } from "@/lib/ai/aiClient";
import { getAIProvider } from "@/lib/ai/aiClient";
import { RoleCategory } from "@/types";

export const dynamic = "force-dynamic";

const EASY_CATEGORY_MAP: Record<string, RoleCategory> = {
  "つくること":     "creator",
  "からだ":         "health",
  "しごと":         "work",
  "たいせつな人":   "relationship",
  "まなぶこと":     "learning",
  "じぶんを大切に": "selfcare",
};

const ROLE_TITLE_MAP: Record<RoleCategory, string> = {
  creator:      "クリエイター",
  health:       "健康・スポーツ",
  work:         "仕事・ビジネス",
  relationship: "恋愛・人間関係",
  learning:     "学び・未来",
  selfcare:     "自分のケア",
};

const EASY_CATEGORY_DISPLAY: Record<RoleCategory, string> = {
  creator:      "つくること",
  health:       "からだ",
  work:         "しごと",
  relationship: "たいせつな人",
  learning:     "まなぶこと",
  selfcare:     "じぶんを大切に",
};

const SYSTEM_PROMPT = `You are an AI assistant for a Japanese life management app called "Role Dream Manager".
Your job: given a user's goal in Japanese, classify it and generate simple actionable steps.

Output ONLY valid JSON matching this schema exactly. No markdown fences, no explanation.

{
  "simple_title": "short goal title (under 20 chars)",
  "easy_category": "one of: つくること | からだ | しごと | たいせつな人 | まなぶこと | じぶんを大切に",
  "internal_role_category": "one of: creator | health | work | relationship | learning | selfcare",
  "project_type": "one of: event | release | learning | health | business | relationship | custom",
  "target_date": "YYYY-MM-DD or null",
  "simple_goal": "what success looks like (under 30 chars)",
  "steps": [
    {
      "title": "step title (under 25 chars)",
      "easy_description": "simple explanation (under 30 chars)",
      "suggested_due_date": "YYYY-MM-DD or null",
      "estimated_minutes": 15,
      "importance": "low | medium | high",
      "urgency": "low | medium | high"
    }
  ],
  "today_tasks": [
    {
      "title": "task title (under 25 chars)",
      "easy_reason": "short reason (under 20 chars)",
      "estimated_minutes": 10
    }
  ],
  "questions": ["follow-up question if info is missing (max 2)"],
  "pet_message": "encouraging message in Japanese (under 40 chars)"
}

Rules:
- steps: 5-8 items covering the full journey from now to goal
- today_tasks: 2-3 small, concrete tasks doable today (under 30 min each)
- All text must be in Japanese
- Use simple, easy-to-understand language (no jargon)
- pet_message should be warm and encouraging`;

function ruleBasedClassify(goalText: string, deadlineType: string, deadlineDate: string | null) {
  const today = format(new Date(), "yyyy-MM-dd");
  return {
    simple_title: goalText.slice(0, 20),
    easy_category: "つくること",
    internal_role_category: "creator" as RoleCategory,
    project_type: "custom",
    target_date: deadlineDate || null,
    simple_goal: "目標を達成する",
    steps: [
      { title: "目標を書き出す", easy_description: "何をしたいか整理する", suggested_due_date: today, estimated_minutes: 15, importance: "high", urgency: "high" },
      { title: "必要なことをリストにする", easy_description: "何が必要か考える", suggested_due_date: null, estimated_minutes: 20, importance: "high", urgency: "medium" },
      { title: "最初の一歩を踏み出す", easy_description: "小さく始める", suggested_due_date: null, estimated_minutes: 30, importance: "high", urgency: "medium" },
    ],
    today_tasks: [
      { title: "目標を1行で書く", easy_reason: "はっきりさせるため", estimated_minutes: 10 },
      { title: "今週できることを考える", easy_reason: "計画を立てるため", estimated_minutes: 15 },
    ],
    questions: [] as string[],
    pet_message: "一歩ずつ進んでいこう！",
  };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    goal_text: string;
    deadline_type: string;
    deadline_date: string | null;
    pet_type?: string;
    save_to_db?: boolean;
  };

  const { goal_text, deadline_type, deadline_date, save_to_db = true } = body;
  if (!goal_text?.trim()) {
    return NextResponse.json({ error: "goal_text is required" }, { status: 400 });
  }

  const today = format(new Date(), "yyyy-MM-dd");

  let aiResult;
  if (isAIConfigured()) {
    try {
      const provider = getAIProvider();
      const userPrompt = `今日の日付: ${today}
ユーザーの目標: ${goal_text}
期限: ${deadline_type === "date" && deadline_date ? deadline_date : deadline_type === "today" ? today : deadline_type}

この目標を分類して、シンプルな手順と今日やることを作ってください。`;

      const result = await provider.generate({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        maxTokens: 2000,
        temperature: 0.7,
      });

      let jsonText = result.content.trim();
      const fence = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fence) jsonText = fence[1].trim();
      aiResult = JSON.parse(jsonText);
    } catch (e) {
      console.error("[classify-goal] AI failed:", e);
      aiResult = ruleBasedClassify(goal_text, deadline_type, deadline_date);
    }
  } else {
    aiResult = ruleBasedClassify(goal_text, deadline_type, deadline_date);
  }

  // ─── DBへ保存 ──────────────────────────────────────────────────
  if (save_to_db) {
    try {
      const roleCategory: RoleCategory = EASY_CATEGORY_MAP[aiResult.easy_category] || aiResult.internal_role_category || "creator";

      // 既存Roleを探す or 作成
      const { data: existingRoles } = await supabase.from("roles")
        .select("id, category").eq("user_id", user.id).eq("category", roleCategory);

      let roleId: string;
      if (existingRoles && existingRoles.length > 0) {
        roleId = existingRoles[0].id;
      } else {
        const { data: newRole } = await supabase.from("roles").insert({
          user_id: user.id,
          category: roleCategory,
          title: ROLE_TITLE_MAP[roleCategory],
          values: [],
          dream: aiResult.simple_goal || null,
          display_order: 0,
        }).select("id").single();
        roleId = newRole!.id;
      }

      // Project作成
      const { data: project } = await supabase.from("projects").insert({
        user_id: user.id,
        role_id: roleId,
        title: aiResult.simple_title || goal_text.slice(0, 50),
        target_date: aiResult.target_date || deadline_date || null,
        status: "active",
        ai_generated: true,
      }).select("id").single();

      // Today Tasks作成
      const taskInserts = (aiResult.today_tasks || []).map((t: { title: string; easy_reason: string; estimated_minutes: number }) => ({
        user_id: user.id,
        role_id: roleId,
        title: t.title,
        purpose: t.easy_reason,
        due_date: today,
        estimated_minutes: t.estimated_minutes || 15,
        quadrant: 1,
        status: "todo",
      }));

      if (taskInserts.length > 0) {
        await supabase.from("tasks").insert(taskInserts);
      }

      // Project tasks (steps) 作成
      if (project && aiResult.steps?.length > 0) {
        const stepInserts = aiResult.steps.map((s: { title: string; easy_description: string; suggested_due_date: string | null; estimated_minutes: number; importance: string; urgency: string }, i: number) => ({
          user_id: user.id,
          project_id: project.id,
          role_id: roleId,
          title: s.title,
          description: s.easy_description,
          due_date: s.suggested_due_date || null,
          estimated_minutes: s.estimated_minutes || 15,
          status: "todo",
          display_order: i,
          quadrant: s.importance === "high" && s.urgency === "high" ? 1
            : s.importance === "high" ? 2
            : s.urgency === "high" ? 3 : 4,
        }));
        await supabase.from("project_tasks").insert(stepInserts);
      }

      return NextResponse.json({
        ...aiResult,
        easy_category_display: EASY_CATEGORY_DISPLAY[roleCategory] || aiResult.easy_category,
        role_id: roleId,
        project_id: project?.id || null,
      });
    } catch (dbErr) {
      console.error("[classify-goal] DB save failed:", dbErr);
    }
  }

  return NextResponse.json(aiResult);
}
