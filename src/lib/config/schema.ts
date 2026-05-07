import { z } from "zod";
import { PROVIDERS } from "@/lib/providers/registry";

export const PromptModeSchema = z.enum(["per-card", "grouped"]);
export type PromptMode = z.infer<typeof PromptModeSchema>;

export const PerBoardSettingsSchema = z.object({
  actionableListIds: z.array(z.string()).default([]),
  actionableLabelIds: z.array(z.string()).default([]),
  promptMode: PromptModeSchema.default("per-card"),
  lastAnalysis: z
    .object({
      reasoning: z.string(),
      confidence: z.enum(["high", "medium", "low"]),
      perListNotes: z.array(
        z.object({
          listId: z.string(),
          listName: z.string(),
          verdict: z.enum(["actionable", "not-actionable", "uncertain"]),
          why: z.string(),
        }),
      ),
      provider: z.string(),
      modelId: z.string(),
      analyzedAt: z.string(),
    })
    .optional(),
});

export type PerBoardSettings = z.infer<typeof PerBoardSettingsSchema>;

export const AppConfigSchema = z.object({
  activeProvider: z.enum(PROVIDERS).default("anthropic"),
  activeModelId: z.string().default(""),
  perBoardSettings: z.record(z.string(), PerBoardSettingsSchema).default({}),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const DEFAULT_CONFIG: AppConfig = {
  activeProvider: "anthropic",
  activeModelId: "",
  perBoardSettings: {},
};
