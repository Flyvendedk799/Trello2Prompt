import { NextResponse } from "next/server";
import { z } from "zod";
import { getBoardSnapshot, getCommentsForCard, hasTrelloCredentials } from "@/lib/trello/client";
import { readConfig } from "@/lib/config/store";
import { selectActionableCards } from "@/lib/cards/select-actionable";
import { groupCardsByList } from "@/lib/cards/group";
import { generateGroupedPrompt, generatePromptForCard } from "@/lib/ai/generate-prompt";
import { AIParseError, MissingProviderKeyError, TrelloError } from "@/lib/errors";
import type { GeneratedPrompt } from "@/lib/ai/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BodySchema = z.object({
  boardId: z.string().min(1),
  mode: z.enum(["per-card", "grouped"]).optional(),
  cardIds: z.array(z.string()).optional(),
  includeComments: z.boolean().optional(),
});

const MAX_CONCURRENCY = 3;

async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function POST(req: Request) {
  if (!hasTrelloCredentials()) {
    return NextResponse.json({ error: "Missing Trello credentials in .env.local" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  }
  const { boardId, cardIds, includeComments } = parsed.data;

  try {
    const config = await readConfig();
    const settings = config.perBoardSettings[boardId];
    if (!settings || (settings.actionableListIds.length === 0 && settings.actionableLabelIds.length === 0)) {
      return NextResponse.json(
        { error: "No actionable lists or labels configured for this board. Run analysis or set overrides first." },
        { status: 400 },
      );
    }

    const snapshot = await getBoardSnapshot(boardId);
    const labelById = new Map(snapshot.labels.map((l) => [l.id, l] as const));
    let actionable = selectActionableCards(snapshot.cards, settings);
    if (cardIds?.length) {
      const requested = new Set(cardIds);
      actionable = actionable.filter((c) => requested.has(c.id));
    }
    if (actionable.length === 0) {
      return NextResponse.json({ prompts: [], message: "No actionable cards match the current settings." });
    }

    const mode = parsed.data.mode ?? settings.promptMode;
    const buildContext = async (card: (typeof actionable)[number]) => {
      const labels = card.idLabels
        .map((id) => labelById.get(id))
        .filter((l): l is NonNullable<typeof l> => Boolean(l));
      const checklists = card.checklists ?? [];
      let recentComments: string[] | undefined;
      if (includeComments) {
        try {
          const comments = await getCommentsForCard(card.id, 3);
          recentComments = comments.map((c) => c.data.text).filter(Boolean);
        } catch {
          recentComments = undefined;
        }
      }
      return { card, labels, checklists, recentComments };
    };

    const results: { prompt: GeneratedPrompt; provider: string; modelId: string }[] = [];

    if (mode === "per-card") {
      const built = await Promise.all(actionable.map(buildContext));
      const out = await mapWithLimit(built, MAX_CONCURRENCY, async (ctx) => {
        const r = await generatePromptForCard(ctx);
        return { prompt: r.prompt, provider: r.resolved.providerId, modelId: r.resolved.modelId };
      });
      results.push(...out);
    } else {
      const groups = groupCardsByList(actionable, snapshot.lists);
      const built = await Promise.all(
        groups.map(async (g) => ({ listName: g.list.name, cards: await Promise.all(g.cards.map(buildContext)) })),
      );
      const out = await mapWithLimit(built, MAX_CONCURRENCY, async (g) => {
        const r = await generateGroupedPrompt(g);
        return { prompt: r.prompt, provider: r.resolved.providerId, modelId: r.resolved.modelId };
      });
      results.push(...out);
    }

    return NextResponse.json({ prompts: results, mode });
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
      { error: err instanceof Error ? err.message : "Unexpected error generating prompts" },
      { status: 500 },
    );
  }
}
