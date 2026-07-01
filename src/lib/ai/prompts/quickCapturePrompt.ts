import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { Role } from "@/types";
import type { AIMessage } from "../providers/base";

export const QUICK_CAPTURE_PROMPT_VERSION =
  process.env.QUICK_CAPTURE_PROMPT_VERSION ?? "v2";

const OUTPUT_SCHEMA = `{
  "type": "task | schedule | idea | inbox | message_draft | sns_post",
  "title": "具体的なタイトル（40文字以内）",
  "description": "補足（省略可）",
  "suggested_role_id": "ロールのID（どのRoleにも当てはまらなければ null）",
  "suggested_role_name": "ロール名（null可）",
  "role_inference_reason": "このRoleを選んだ理由（30文字以内）",
  "gap_target": "埋めるGap（ロール情報から引用、省略可）",
  "long_term_connection": "長期目標との接続（省略可）",
  "due_date": "YYYY-MM-DD（期日が読み取れる場合のみ、なければ null）",
  "estimated_minutes": 30,
  "importance": "low | medium | high",
  "urgency": "low | medium | high",
  "quadrant": "important_urgent | important_not_urgent | urgent_not_important | not_important_not_urgent",
  "suggested_date": "YYYY-MM-DD（予定の場合のみ）",
  "suggested_time": "HH:MM（時刻が読み取れる場合のみ）",
  "suggested_duration_minutes": 60,
  "confidence": "low | medium | high",
  "save_destination": "task | schedule | today_plan | inbox",
  "generated_content": "メッセージ/SNS投稿の本文テキスト（message_draft・sns_postのみ。それ以外はこのフィールドを含めない）",
  "reasoning": "この分類の理由（50文字以内）"
}`;

export function buildQuickCaptureMessages(input: {
  rawText: string;
  roles: Role[];
  today: Date;
}): AIMessage[] {
  const { rawText, roles, today } = input;

  const systemPrompt = `You are the AI parser for "Role Dream Manager", a Japanese life-role dream management app.

Your job: Parse a user's raw quick-capture text and return a single structured JSON object.

CLASSIFICATION RULES:
- type="task": action to do (verb phrase, no specific future time)
- type="schedule": event with a specific date/time ("明日3時に", "今週金曜に")
- type="idea": reflection, insight, memo, thought (no clear action)
- type="inbox": ambiguous — you cannot confidently classify it
- type="message_draft": user wants to draft a message/LINE/email to someone
  Signals: 「〇〇に連絡」「〇〇にメッセージ送って」「〇〇にLINE」「〇〇にメール」
  → Set generated_content to the actual message text in Japanese.
    Write a warm, natural message. Use【角括弧】for unknown info (e.g.,【日時】【場所】).
    Keep it concise (3–6 lines). Match the purpose inferred from the input.
  → save_destination = "inbox"
- type="sns_post": user wants to create an SNS/social media announcement
  Signals: 「SNSで告知」「ツイートして」「Instagram投稿」「告知文作って」
  → Set generated_content to the actual post text in Japanese.
    Include relevant emoji and 2–4 hashtags. Keep under 140 characters.
    Tone: exciting, inviting, artist-style.
  → save_destination = "inbox"

SAVE DESTINATION:
- "task": clear action item → add to task list
- "schedule": event with date/time → add to calendar
- "today_plan": user explicitly says "今日やりたい" or "今日やる" → add to today's plan
- "inbox": low confidence, generation type, OR user says "あとで" → Inbox for later review

ROLE INFERENCE:
Match the content against the user's Role list (provided below).
Use role_id and role_name from that list exactly.
If nothing matches, set both to null.

IMPORTANT: For message_draft and sns_post, generated_content is REQUIRED and must be the actual text content (not a description of it). Write it in Japanese as if you are the user sending it.

Output ONLY valid JSON — no markdown, no explanations.

Output schema:
${OUTPUT_SCHEMA}`;

  const rolesSection =
    roles.length === 0
      ? "ロールなし"
      : roles
          .map(
            (r) =>
              `- ID: ${r.id} | ${r.title}（${r.category}）` +
              (r.dream ? ` | Dream: ${r.dream}` : "") +
              (r.gap ? ` | Gap: ${r.gap}` : "") +
              (r.next_focus ? ` | Next: ${r.next_focus}` : "")
          )
          .join("\n");

  const userPrompt = `## 今日の日付
${format(today, "yyyy年M月d日（E）HH:mm", { locale: ja })}

## ユーザーのRole一覧
${rolesSection}

## キャプチャしたテキスト
${rawText}

上記のテキストをJSONにパースしてください。JSONのみを出力してください。`;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];
}
