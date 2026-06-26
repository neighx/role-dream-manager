import { getAIProvider } from "./aiClient";
import { buildQuickCaptureMessages, QUICK_CAPTURE_PROMPT_VERSION } from "./prompts/quickCapturePrompt";
import type { Role, ParsedQuickCapture, Quadrant } from "@/types";

const IMPORTANCE_MAP: Record<string, number> = {
  low: 2,
  medium: 3,
  high: 5,
};

const QUADRANT_MAP: Record<string, Quadrant> = {
  important_urgent: 1,
  important_not_urgent: 2,
  urgent_not_important: 3,
  not_important_not_urgent: 4,
};

interface RawAIParsed {
  type?: string;
  title?: string;
  description?: string;
  suggested_role_id?: string | null;
  suggested_role_name?: string | null;
  role_inference_reason?: string;
  gap_target?: string;
  long_term_connection?: string;
  due_date?: string | null;
  estimated_minutes?: number;
  importance?: string;
  urgency?: string;
  quadrant?: string;
  suggested_date?: string | null;
  suggested_time?: string | null;
  suggested_duration_minutes?: number | null;
  confidence?: string;
  save_destination?: string;
  reasoning?: string;
}

export async function parseQuickCaptureWithAI(
  rawText: string,
  roles: Role[]
): Promise<ParsedQuickCapture & { ai_model: string; prompt_version: string }> {
  const provider = getAIProvider();
  const messages = buildQuickCaptureMessages({ rawText, roles, today: new Date() });

  const result = await provider.generate({ messages, maxTokens: 700 });

  let raw: RawAIParsed;
  try {
    const text = result.content.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    raw = JSON.parse(text) as RawAIParsed;
  } catch {
    throw new Error("AI response was not valid JSON");
  }

  const parsed: ParsedQuickCapture = {
    type: (raw.type as ParsedQuickCapture["type"]) ?? "inbox",
    title: raw.title ?? rawText.slice(0, 40),
    description: raw.description,
    suggested_role_id: raw.suggested_role_id ?? null,
    suggested_role_name: raw.suggested_role_name ?? null,
    role_inference_reason: raw.role_inference_reason,
    gap_target: raw.gap_target,
    long_term_connection: raw.long_term_connection,
    due_date: raw.due_date ?? undefined,
    estimated_minutes: raw.estimated_minutes ?? 30,
    importance: raw.importance ? IMPORTANCE_MAP[raw.importance] ?? 3 : 3,
    urgency: raw.urgency ? IMPORTANCE_MAP[raw.urgency] ?? 3 : 3,
    quadrant: raw.quadrant ? QUADRANT_MAP[raw.quadrant] ?? 2 : 2,
    suggested_date: raw.suggested_date ?? undefined,
    suggested_time: raw.suggested_time ?? undefined,
    suggested_duration_minutes: raw.suggested_duration_minutes ?? undefined,
    confidence: (raw.confidence as ParsedQuickCapture["confidence"]) ?? "medium",
    save_destination:
      (raw.save_destination as ParsedQuickCapture["save_destination"]) ?? "inbox",
    reasoning: raw.reasoning,
    ai_generated: true,
    ai_model: result.model ?? provider.defaultModel,
  };

  return {
    ...parsed,
    ai_model: result.model ?? provider.defaultModel,
    prompt_version: QUICK_CAPTURE_PROMPT_VERSION,
  };
}

export function fallbackParsedCapture(rawText: string): ParsedQuickCapture {
  return {
    type: "inbox",
    title: rawText.slice(0, 60),
    suggested_role_id: null,
    suggested_role_name: null,
    confidence: "low",
    save_destination: "inbox",
    reasoning: "AI解析不可のためInboxに保存",
    ai_generated: false,
  };
}
