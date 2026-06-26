import type { SupabaseClient } from "@supabase/supabase-js";

export type AIFeature =
  | "today_plan"
  | "quick_capture"
  | "roadmap"
  | "weekly_review"
  | "project_breakdown";

interface LogAIOptions {
  feature: AIFeature;
  model: string;
  promptVersion?: string;
  /** 生成結果の要約（最大500文字・個人情報を含まないこと） */
  resultSummary?: string;
  error?: string;
}

/**
 * AIコール結果を軽量ログとして保存する（サーバーサイド専用）
 *
 * 保存しない情報:
 * - プロンプト全文（個人情報を含む可能性）
 * - 音声データ・バイナリ
 * - 全生成テキスト（要約500文字のみ）
 *
 * 保存する情報:
 * - feature名、model名、prompt_version
 * - result_summary（先頭500文字）
 * - error（ある場合）
 * - created_at（90日後に自動削除対象）
 */
export async function logAICall(
  supabase: SupabaseClient,
  userId: string,
  options: LogAIOptions
): Promise<void> {
  const { feature, model, promptVersion, resultSummary, error } = options;

  try {
    await supabase.from("ai_logs").insert({
      user_id: userId,
      feature,
      model,
      prompt_version: promptVersion ?? null,
      result_summary: resultSummary ? resultSummary.slice(0, 500) : null,
      error: error ? error.slice(0, 500) : null,
    });
  } catch {
    // ログ失敗はメイン処理に影響させない
  }
}
