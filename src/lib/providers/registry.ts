export const PROVIDERS = ["anthropic", "openai", "google", "openai-compatible"] as const;
export type ProviderId = (typeof PROVIDERS)[number];

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  anthropic: "Anthropic (Claude)",
  openai: "OpenAI (GPT)",
  google: "Google (Gemini)",
  "openai-compatible": "OpenAI-compatible (Ollama, LM Studio)",
};

export const PROVIDER_DEFAULT_MODELS: Record<ProviderId, string> = {
  anthropic: "claude-sonnet-4-5",
  openai: "gpt-4.1",
  google: "gemini-2.5-pro",
  "openai-compatible": "",
};

export const PROVIDER_ENV_VARS: Record<ProviderId, string[]> = {
  anthropic: ["ANTHROPIC_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  google: ["GOOGLE_GENERATIVE_AI_API_KEY"],
  "openai-compatible": ["OPENAI_COMPATIBLE_BASE_URL"],
};

export type ProviderAvailability = Record<ProviderId, boolean>;

export function getProviderAvailability(): ProviderAvailability {
  const has = (name: string) => Boolean(process.env[name] && process.env[name]!.length > 0);
  return {
    anthropic: has("ANTHROPIC_API_KEY"),
    openai: has("OPENAI_API_KEY"),
    google: has("GOOGLE_GENERATIVE_AI_API_KEY"),
    "openai-compatible": has("OPENAI_COMPATIBLE_BASE_URL"),
  };
}
