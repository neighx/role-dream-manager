import { AIProvider, AICompletionOptions, AICompletionResult } from "./base";

// OpenAI provider stub — install "openai" package and implement when switching.
// AI_PROVIDER=openai OPENAI_API_KEY=sk-...
export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  readonly defaultModel = "gpt-4o";

  async generate(_options: AICompletionOptions): Promise<AICompletionResult> {
    throw new Error(
      "OpenAI provider not yet implemented. Install the 'openai' package and implement this class."
    );
  }
}
