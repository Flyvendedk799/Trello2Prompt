import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeBoard } from "@/lib/ai/analyze-board";
import { getBoardSnapshot, hasTrelloCredentials } from "@/lib/trello/client";
import { writeConfig } from "@/lib/config/store";
import { PerBoardSettingsSchema } from "@/lib/config/schema";
import { AIParseError, MissingProviderKeyError, TrelloError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BodySchema = z.object({ boardId: z.string().min(1) });

export async function POST(req: Request) {
  if (!hasTrelloCredentials()) {
    return NextResponse.json({ error: "Missing Trello credentials in .env.local" }, { status: 400 });
  }
  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  }
  const { boardId } = parsed.data;

  try {
    const snapshot = await getBoardSnapshot(boardId);
    const { analysis, resolved } = await analyzeBoard(snapshot);

    const updated = await writeConfig((current) => {
      const existing = current.perBoardSettings[boardId];
      const seedFromAnalysis = !existing || (existing.actionableListIds.length === 0 && existing.actionableLabelIds.length === 0);
      const next = PerBoardSettingsSchema.parse({
        ...(existing ?? {}),
        actionableListIds: seedFromAnalysis ? analysis.actionableListIds : existing!.actionableListIds,
        actionableLabelIds: seedFromAnalysis ? analysis.actionableLabelIds : existing!.actionableLabelIds,
        promptMode: existing?.promptMode ?? "per-card",
        lastAnalysis: {
          reasoning: analysis.reasoning,
          confidence: analysis.confidence,
          perListNotes: analysis.perListNotes,
          provider: resolved.providerId,
          modelId: resolved.modelId,
          analyzedAt: new Date().toISOString(),
        },
      });
      current.perBoardSettings[boardId] = next;
      return current;
    });

    return NextResponse.json({
      analysis,
      settings: updated.perBoardSettings[boardId],
      provider: resolved.providerId,
      modelId: resolved.modelId,
    });
  } catch (err) {
    if (err instanceof MissingProviderKeyError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof TrelloError) {
      return NextResponse.json({ error: err.userMessage(), status: err.status }, { status: 502 });
    }
    if (err instanceof AIParseError) {
      return NextResponse.json({ error: err.message, rawText: err.rawText?.slice(0, 1024) }, { status: 502 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error analyzing board" },
      { status: 500 },
    );
  }
}
