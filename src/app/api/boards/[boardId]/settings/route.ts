import { NextResponse } from "next/server";
import { z } from "zod";
import { writeConfig } from "@/lib/config/store";
import { PerBoardSettingsSchema, PromptModeSchema } from "@/lib/config/schema";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  actionableListIds: z.array(z.string()).optional(),
  actionableLabelIds: z.array(z.string()).optional(),
  promptMode: PromptModeSchema.optional(),
});

export async function PUT(req: Request, ctx: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  }

  const updated = await writeConfig((current) => {
    const existing = current.perBoardSettings[boardId];
    const next = PerBoardSettingsSchema.parse({
      actionableListIds: parsed.data.actionableListIds ?? existing?.actionableListIds ?? [],
      actionableLabelIds: parsed.data.actionableLabelIds ?? existing?.actionableLabelIds ?? [],
      promptMode: parsed.data.promptMode ?? existing?.promptMode ?? "per-card",
      lastAnalysis: existing?.lastAnalysis,
    });
    current.perBoardSettings[boardId] = next;
    return current;
  });

  return NextResponse.json({ settings: updated.perBoardSettings[boardId] });
}
