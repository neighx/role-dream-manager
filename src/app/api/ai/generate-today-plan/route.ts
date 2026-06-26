import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { isAIConfigured } from "@/lib/ai/aiClient";
import { generateTodayPlanWithAI } from "@/lib/ai/generateTodayPlanWithAI";
import { TODAY_PLAN_PROMPT_VERSION } from "@/lib/ai/prompts/todayPlanPrompt";
import { ruleBasedTodayPlan } from "@/lib/plans/ruleBasedTodayPlan";
import { TodayPlanResult, RegenerationMode, Role, Task, Schedule } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as {
      selectedRoleIds: string[];
      regenerationMode?: RegenerationMode;
    };

    const { selectedRoleIds, regenerationMode } = body;

    if (!selectedRoleIds?.length) {
      return NextResponse.json({ error: "selectedRoleIds is required" }, { status: 400 });
    }

    // ─── 認証 ─────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    const weekStart = getMonday(today);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    // ─── データロード ─────────────────────────────────────────
    const [
      { data: profile },
      { data: checkin },
      { data: allRoles },
      { data: recentTasks },
      { data: weekSchedules },
    ] = await Promise.all([
      supabase.from("users_profile").select("*").eq("user_id", user.id).single(),
      supabase.from("daily_checkins").select("*")
        .eq("user_id", user.id).eq("date", todayStr).maybeSingle(),
      supabase.from("roles").select("*").eq("user_id", user.id).order("display_order"),
      supabase.from("tasks").select("*").eq("user_id", user.id)
        .gte("created_at", format(new Date(Date.now() - 14 * 86400000), "yyyy-MM-dd"))
        .order("created_at", { ascending: false }).limit(20),
      supabase.from("schedules").select("*").eq("user_id", user.id)
        .gte("start_time", `${format(weekStart, "yyyy-MM-dd")}T00:00:00`)
        .lte("start_time", `${format(weekEnd, "yyyy-MM-dd")}T23:59:59`),
    ]);

    if (!checkin) {
      return NextResponse.json({ error: "今日のチェックインが必要です" }, { status: 400 });
    }

    // 選択されたRoleのみフィルタ
    const selectedRoles = (allRoles ?? []).filter(
      (r: Role) => selectedRoleIds.includes(r.id)
    );

    if (selectedRoles.length === 0) {
      return NextResponse.json({ error: "有効なRoleが見つかりません" }, { status: 400 });
    }

    const tasks = (recentTasks ?? []) as Task[];
    const recentDoneTasks = tasks.filter((t) => t.status === "done").slice(0, 8);
    const pendingTasks    = tasks.filter((t) => t.status !== "done").slice(0, 8);

    // ─── AI生成 or フォールバック ─────────────────────────────
    let result: TodayPlanResult;

    if (isAIConfigured()) {
      try {
        result = await generateTodayPlanWithAI({
          date: today,
          profile,
          checkin,
          selectedRoles,
          recentDoneTasks,
          pendingTasks,
          weekSchedules: (weekSchedules ?? []) as Schedule[],
          regenerationMode,
        });
      } catch (aiError) {
        console.error("[AI] generation failed, falling back to rules:", aiError);
        result = ruleBasedTodayPlan(
          { checkin, selectedRoles },
          "AI生成に失敗しました。まずは小さなプランを作りました。"
        );
      }
    } else {
      result = ruleBasedTodayPlan({ checkin, selectedRoles });
    }

    // ─── daily_plans に保存 ──────────────────────────────────
    try {
      const { data: existingPlan } = await supabase
        .from("daily_plans")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", todayStr)
        .maybeSingle();

      const planData = {
        user_id: user.id,
        date: todayStr,
        checkin_id: checkin.id,
        selected_role_ids: selectedRoleIds,
        overall_message: result.meta.overall_message,
        pet_message: result.meta.pet_message,
        emotional_summary: result.meta.emotional_summary,
        available_time_strategy: result.meta.available_time_strategy,
        reflection_question: result.meta.reflection_question,
        not_today_json: result.meta.not_today,
        ai_generated: result.meta.ai_generated,
        ai_generation_model: result.meta.ai_model ?? null,
        prompt_version: result.meta.ai_generated ? TODAY_PLAN_PROMPT_VERSION : null,
        updated_at: new Date().toISOString(),
      };

      if (existingPlan) {
        await supabase.from("daily_plans").update(planData).eq("id", existingPlan.id);
      } else {
        await supabase.from("daily_plans").insert(planData);
      }
    } catch (dbErr) {
      // DB保存失敗はサイレントに（プランの返却は行う）
      console.error("[daily_plans] save failed:", dbErr);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[generate-today-plan] unexpected error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
