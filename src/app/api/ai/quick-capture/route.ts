import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAIConfigured } from "@/lib/ai/aiClient";
import { parseQuickCaptureWithAI, fallbackParsedCapture } from "@/lib/ai/parseQuickCapture";
import { QUICK_CAPTURE_PROMPT_VERSION } from "@/lib/ai/prompts/quickCapturePrompt";
import type { Role, QuickCaptureInputType } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      rawText: string;
      inputType?: QuickCaptureInputType;
    };

    const { rawText, inputType = "text" } = body;

    if (!rawText?.trim()) {
      return NextResponse.json({ error: "rawText is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: rolesData } = await supabase
      .from("roles")
      .select("*")
      .eq("user_id", user.id)
      .order("display_order");

    const roles = (rolesData ?? []) as Role[];

    let parsed;
    let aiProvider: string | null = null;
    let aiModel: string | null = null;
    let promptVersion: string | null = null;

    if (isAIConfigured()) {
      try {
        const result = await parseQuickCaptureWithAI(rawText, roles);
        parsed = result;
        aiProvider = process.env.AI_PROVIDER ?? "claude";
        aiModel = result.ai_model ?? null;
        promptVersion = result.prompt_version ?? null;
      } catch (err) {
        console.error("[quick-capture] AI parse failed:", err);
        parsed = fallbackParsedCapture(rawText);
      }
    } else {
      parsed = fallbackParsedCapture(rawText);
    }

    // Save to quick_captures as pending
    const { data: capture, error: insertErr } = await supabase
      .from("quick_captures")
      .insert({
        user_id: user.id,
        raw_input: rawText,
        input_type: inputType,
        parsed_type: parsed.type,
        parsed_json: parsed,
        status: "pending",
        confidence: parsed.confidence,
        created_role_id: parsed.suggested_role_id ?? null,
        ai_provider: aiProvider,
        ai_model: aiModel,
        prompt_version: promptVersion ?? QUICK_CAPTURE_PROMPT_VERSION,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("[quick-capture] insert error:", insertErr);
    }

    return NextResponse.json({
      captureId: capture?.id ?? null,
      parsed,
    });
  } catch (error) {
    console.error("[quick-capture] unexpected error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
