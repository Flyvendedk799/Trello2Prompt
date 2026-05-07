import { describe, expect, it } from "vitest";
import { BoardAnalysisSchema, GeneratedPromptSchema } from "@/lib/ai/schemas";

describe("BoardAnalysisSchema", () => {
  it("accepts a well-formed analysis", () => {
    const ok = BoardAnalysisSchema.safeParse({
      actionableListIds: ["L1"],
      actionableLabelIds: [],
      reasoning: "List 'To Do' is clearly actionable.",
      confidence: "high",
      perListNotes: [{ listId: "L1", listName: "To Do", verdict: "actionable", why: "name" }],
    });
    expect(ok.success).toBe(true);
  });

  it("rejects bad confidence values", () => {
    const bad = BoardAnalysisSchema.safeParse({
      actionableListIds: [],
      actionableLabelIds: [],
      reasoning: "x",
      confidence: "very-high",
      perListNotes: [],
    });
    expect(bad.success).toBe(false);
  });

  it("rejects bad verdict values in perListNotes", () => {
    const bad = BoardAnalysisSchema.safeParse({
      actionableListIds: [],
      actionableLabelIds: [],
      reasoning: "x",
      confidence: "low",
      perListNotes: [{ listId: "L", listName: "X", verdict: "maybe", why: "..." }],
    });
    expect(bad.success).toBe(false);
  });
});

describe("GeneratedPromptSchema", () => {
  it("accepts a valid prompt", () => {
    const ok = GeneratedPromptSchema.safeParse({
      title: "Add login screen",
      prompt: "Implement a login screen with email + password.",
      acceptanceCriteria: ["User can submit", "Errors are visible"],
      openQuestions: [],
      sourceCardIds: ["card-1"],
    });
    expect(ok.success).toBe(true);
  });

  it("rejects empty sourceCardIds", () => {
    const bad = GeneratedPromptSchema.safeParse({
      title: "x",
      prompt: "y",
      acceptanceCriteria: [],
      openQuestions: [],
      sourceCardIds: [],
    });
    expect(bad.success).toBe(false);
  });
});
