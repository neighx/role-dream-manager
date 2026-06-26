import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAIConfigured } from "@/lib/ai/aiClient";
import { generateProjectBreakdownWithAI, ruleBasedProjectBreakdown } from "@/lib/ai/generateProjectBreakdownWithAI";
import { PROJECT_BREAKDOWN_PROMPT_VERSION } from "@/lib/ai/prompts/projectBreakdownPrompt";
import { logAICall } from "@/lib/ai/logAI";
import { Project, Role } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    projectId?: string;
    project: Partial<Project> & { title: string; target_date: string };
  };

  const { project, projectId } = body;
  if (!project?.title || !project?.target_date) {
    return NextResponse.json(
      { error: "project.title and project.target_date are required" },
      { status: 400 }
    );
  }

  let role: Role | null = null;
  if (project.role_id) {
    const { data } = await supabase
      .from("roles")
      .select("*")
      .eq("id", project.role_id)
      .single();
    role = data;
  }

  let breakdown;
  if (isAIConfigured()) {
    try {
      breakdown = await generateProjectBreakdownWithAI(project, role);
    } catch (e) {
      console.error("AI breakdown failed, using rule-based:", e);
      breakdown = ruleBasedProjectBreakdown(project);
    }
  } else {
    breakdown = ruleBasedProjectBreakdown(project);
  }

  if (projectId) {
    await supabase
      .from("projects")
      .update({
        ai_generated: true,
        ai_generation_model: isAIConfigured() ? "claude" : "rule_based",
        prompt_version: PROJECT_BREAKDOWN_PROMPT_VERSION,
      })
      .eq("id", projectId)
      .eq("user_id", user.id);
  }

  await logAICall(supabase, user.id, {
    feature: "project_breakdown",
    model: isAIConfigured() ? "claude" : "rule_based",
    promptVersion: PROJECT_BREAKDOWN_PROMPT_VERSION,
    resultSummary: breakdown.summary.slice(0, 200),
  });

  return NextResponse.json({ breakdown });
}
