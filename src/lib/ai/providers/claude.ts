import Anthropic from "@anthropic-ai/sdk";
import { AIProvider, AICompletionOptions, AICompletionResult } from "./base";

export class ClaudeProvider implements AIProvider {
  readonly name = "claude";
  readonly defaultModel = "claude-sonnet-4-6";

  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generate(options: AICompletionOptions): Promise<AICompletionResult> {
    const { messages, model, maxTokens = 4096, temperature = 0.7 } = options;

    const systemMsg = messages.find((m) => m.role === "system");
    const conversationMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const response = await this.client.messages.create({
      model: model ?? this.defaultModel,
      max_tokens: maxTokens,
      temperature,
      system: systemMsg?.content,
      messages: conversationMessages,
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    return {
      content: text,
      model: response.model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
