import { AIProvider, AICompletionOptions, AICompletionResult } from "./base";

// Gemini provider stub — install "@google/generative-ai" package and implement when switching.
// AI_PROVIDER=gemini GEMINI_API_KEY=...
export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  readonly defaultModel = "gemini-1.5-pro";

  async generate(_options: AICompletionOptions): Promise<AICompletionResult> {
    throw new Error(
      "Gemini provider not yet implemented. Install the '@google/generative-ai' package and implement this class."
    );
  }
}
