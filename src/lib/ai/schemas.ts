import { z } from "zod";

export const BoardAnalysisSchema = z.object({
  actionableListIds: z.array(z.string()),
  actionableLabelIds: z.array(z.string()),
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
});

export type BoardAnalysis = z.infer<typeof BoardAnalysisSchema>;

export const GeneratedPromptSchema = z.object({
  title: z.string(),
  prompt: z.string(),
  acceptanceCriteria: z.array(z.string()),
  openQuestions: z.array(z.string()),
  sourceCardIds: z.array(z.string()).min(1),
});

export type GeneratedPrompt = z.infer<typeof GeneratedPromptSchema>;
