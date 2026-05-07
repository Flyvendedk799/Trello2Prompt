import type { LanguageModel } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { readConfig } from "@/lib/config/store";
import { MissingProviderKeyError } from "@/lib/errors";
import { PROVIDER_DEFAULT_MODELS, type ProviderId } from "@/lib/providers/registry";

export interface ResolvedModel {
  model: LanguageModel;
  providerId: ProviderId;
  modelId: string;
}

export async function getActiveModel(): Promise<ResolvedModel> {
  const config = await readConfig();
  const providerId = config.activeProvider;
  const modelId = config.activeModelId || PROVIDER_DEFAULT_MODELS[providerId];

  switch (providerId) {
    case "anthropic": {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new MissingProviderKeyError("anthropic", "ANTHROPIC_API_KEY");
      }
      if (!modelId) {
        throw new MissingProviderKeyError("anthropic", "activeModelId (set in /settings)");
      }
      return { model: anthropic(modelId), providerId, modelId };
    }
    case "openai": {
      if (!process.env.OPENAI_API_KEY) {
        throw new MissingProviderKeyError("openai", "OPENAI_API_KEY");
      }
      if (!modelId) {
        throw new MissingProviderKeyError("openai", "activeModelId (set in /settings)");
      }
      return { model: openai(modelId), providerId, modelId };
    }
    case "google": {
      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
        throw new MissingProviderKeyError("google", "GOOGLE_GENERATIVE_AI_API_KEY");
      }
      if (!modelId) {
        throw new MissingProviderKeyError("google", "activeModelId (set in /settings)");
      }
      return { model: google(modelId), providerId, modelId };
    }
    case "openai-compatible": {
      const baseURL = process.env.OPENAI_COMPATIBLE_BASE_URL;
      if (!baseURL) {
        throw new MissingProviderKeyError("openai-compatible", "OPENAI_COMPATIBLE_BASE_URL");
      }
      const apiKey = process.env.OPENAI_COMPATIBLE_API_KEY ?? "not-needed";
      const resolvedModelId = modelId || process.env.OPENAI_COMPATIBLE_MODEL || "";
      if (!resolvedModelId) {
        throw new MissingProviderKeyError(
          "openai-compatible",
          "activeModelId (set in /settings) or OPENAI_COMPATIBLE_MODEL",
        );
      }
      const provider = createOpenAICompatible({ name: "openai-compatible", baseURL, apiKey });
      return { model: provider(resolvedModelId), providerId, modelId: resolvedModelId };
    }
  }
}
