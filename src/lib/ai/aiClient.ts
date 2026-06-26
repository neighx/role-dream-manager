import { AIProvider } from "./providers/base";
import { ClaudeProvider } from "./providers/claude";
import { OpenAIProvider } from "./providers/openai";
import { GeminiProvider } from "./providers/gemini";

let _provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (_provider) return _provider;

  const providerName = process.env.AI_PROVIDER ?? "claude";

  switch (providerName) {
    case "openai":
      _provider = new OpenAIProvider();
      break;
    case "gemini":
      _provider = new GeminiProvider();
      break;
    case "claude":
    default:
      _provider = new ClaudeProvider();
      break;
  }

  return _provider;
}

export function isAIConfigured(): boolean {
  const provider = process.env.AI_PROVIDER ?? "claude";
  switch (provider) {
    case "openai":  return !!process.env.OPENAI_API_KEY;
    case "gemini":  return !!process.env.GEMINI_API_KEY;
    case "claude":
    default:        return !!process.env.ANTHROPIC_API_KEY;
  }
}
