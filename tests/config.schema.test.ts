import { describe, expect, it } from "vitest";
import { AppConfigSchema, PerBoardSettingsSchema } from "@/lib/config/schema";

describe("AppConfigSchema", () => {
  it("fills in defaults from an empty object", () => {
    const parsed = AppConfigSchema.parse({});
    expect(parsed.activeProvider).toBe("anthropic");
    expect(parsed.activeModelId).toBe("");
    expect(parsed.perBoardSettings).toEqual({});
  });

  it("rejects an unknown provider", () => {
    const bad = AppConfigSchema.safeParse({ activeProvider: "nope" });
    expect(bad.success).toBe(false);
  });

  it("validates per-board settings nested structure", () => {
    const parsed = AppConfigSchema.parse({
      activeProvider: "openai",
      activeModelId: "gpt-4.1",
      perBoardSettings: {
        b1: { actionableListIds: ["L1"], actionableLabelIds: [], promptMode: "grouped" },
      },
    });
    expect(parsed.perBoardSettings.b1.promptMode).toBe("grouped");
  });
});

describe("PerBoardSettingsSchema", () => {
  it("defaults promptMode to per-card", () => {
    const parsed = PerBoardSettingsSchema.parse({});
    expect(parsed.promptMode).toBe("per-card");
  });

  it("rejects bad promptMode", () => {
    const bad = PerBoardSettingsSchema.safeParse({ promptMode: "everything" });
    expect(bad.success).toBe(false);
  });
});
