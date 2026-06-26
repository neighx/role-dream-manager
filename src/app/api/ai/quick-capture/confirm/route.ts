import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type { ParsedQuickCapture } from "@/types";

export const dynamic = "force-dynamic";

interface ConfirmBody {
  captureId: string | null;
  parsed: ParsedQuickCapture;
  rawText: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as ConfirmBody;
    const { captureId, parsed, rawText } = body;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = format(new Date(), "yyyy-MM-dd");
    let savedId: string | null = null;

    // ─── Task ────────────────────────────────────────────────────
    if (parsed.save_destination === "task" || parsed.save_destination === "today_plan") {
      const { data: task, error } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          role_id: parsed.suggested_role_id ?? null,
          title: parsed.title,
          description: parsed.description ?? null,
          purpose: parsed.gap_target ?? null,
          due_date: parsed.due_date ?? null,
          estimated_minutes: parsed.estimated_minutes ?? null,
          importance: parsed.importance ?? null,
          urgency: parsed.urgency ?? null,
          quadrant: parsed.quadrant ?? null,
          status: "todo",
          source: "quick_capture",
          gap_target: parsed.gap_target ?? null,
          long_term_connection: parsed.long_term_connection ?? null,
          created_from_quick_capture_id: captureId ?? null,
        })
        .select("id")
        .single();

      if (error) throw error;
      savedId = task?.id ?? null;

      if (captureId) {
        await supabase
          .from("quick_captures")
          .update({ status: "saved", created_task_id: savedId })
          .eq("id", captureId)
          .eq("user_id", user.id);
      }

      return NextResponse.json({ success: true, destination: "task", savedId });
    }

    // ─── Schedule ────────────────────────────────────────────────
    if (parsed.save_destination === "schedule") {
      const dateStr = parsed.suggested_date ?? today;
      const timeStr = parsed.suggested_time ?? "09:00";
      const startTime = `${dateStr}T${timeStr}:00`;
      const durationMin = parsed.suggested_duration_minutes ?? parsed.estimated_minutes ?? 60;
      const endDt = new Date(startTime);
      endDt.setMinutes(endDt.getMinutes() + durationMin);

      const { data: schedule, error } = await supabase
        .from("schedules")
        .insert({
          user_id: user.id,
          role_id: parsed.suggested_role_id ?? null,
          title: parsed.title,
          description: parsed.description ?? null,
          schedule_type: "other",
          start_time: startTime,
          end_time: endDt.toISOString(),
          is_all_day: false,
          source: "quick_capture",
          gap_target: parsed.gap_target ?? null,
          long_term_connection: parsed.long_term_connection ?? null,
          created_from_quick_capture_id: captureId ?? null,
        })
        .select("id")
        .single();

      if (error) throw error;
      savedId = schedule?.id ?? null;

      if (captureId) {
        await supabase
          .from("quick_captures")
          .update({ status: "saved", created_schedule_id: savedId })
          .eq("id", captureId)
          .eq("user_id", user.id);
      }

      return NextResponse.json({ success: true, destination: "schedule", savedId });
    }

    // ─── Inbox (fallback) ────────────────────────────────────────
    const { data: inboxItem, error: inboxErr } = await supabase
      .from("inbox_items")
      .insert({
        user_id: user.id,
        raw_input: rawText,
        title: parsed.title,
        description: parsed.description ?? null,
        suggested_type: parsed.type === "inbox" ? null : parsed.type,
        suggested_role_id: parsed.suggested_role_id ?? null,
        suggested_date: parsed.due_date ?? parsed.suggested_date ?? null,
        suggested_quadrant: parsed.quadrant ? String(parsed.quadrant) : null,
        suggested_gap_target: parsed.gap_target ?? null,
        suggested_long_term_connection: parsed.long_term_connection ?? null,
        status: "open",
      })
      .select("id")
      .single();

    if (inboxErr) throw inboxErr;
    savedId = inboxItem?.id ?? null;

    if (captureId) {
      await supabase
        .from("quick_captures")
        .update({ status: "saved" })
        .eq("id", captureId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ success: true, destination: "inbox", savedId });
  } catch (error) {
    console.error("[quick-capture/confirm] error:", error);
    return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
  }
}
