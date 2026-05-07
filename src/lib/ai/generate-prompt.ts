import { generateObject, NoObjectGeneratedError } from "ai";
import { getActiveModel, type ResolvedModel } from "@/lib/ai/model";
import { GeneratedPromptSchema, type GeneratedPrompt } from "@/lib/ai/schemas";
import type { TrelloCard, TrelloChecklist, TrelloLabel } from "@/lib/trello/schemas";
import { AIParseError } from "@/lib/errors";

const SYSTEM_PROMPT = `You are writing a delegation order for an autonomous coding agent (e.g. Claude Code, Cursor).

The receiving agent already has direct access to the relevant code repository and will explore files itself. Therefore:
- Do NOT include exploration steps ("first read X.ts").
- Do NOT reference local files or paths in this codebase — you don't know them.
- Do NOT include filler ("hope this helps", "let me know").
- DO write a single, self-contained instruction in imperative voice.
- DO derive explicit, testable acceptance criteria. Map any checklist items into acceptance criteria.
- DO surface ambiguity or missing information in "openQuestions" rather than inventing requirements.
- Reference URLs from attachments may appear in the prompt body under a "References" line.
- Treat label names, due dates, and member usernames as priority/ownership hints, not requirements.

Return ONLY structured JSON matching the provided schema.`;

interface CardContext {
  card: TrelloCard;
  labels: TrelloLabel[];
  checklists: TrelloChecklist[];
  recentComments?: string[];
}

function renderCardForPrompt(ctx: CardContext): string {
  const { card, labels, checklists, recentComments } = ctx;
  const labelNames = labels.filter((l) => l.name).map((l) => l.name);
  const checklistText = checklists
    .map((cl) => {
      const items = cl.checkItems.map((it) => `  - [${it.state === "complete" ? "x" : " "}] ${it.name}`).join("\n");
      return `${cl.name}:\n${items}`;
    })
    .join("\n\n");
  const attachmentLines = (card.attachments ?? [])
    .filter((a) => a.url)
    .map((a) => `- ${a.name || a.url}: ${a.url}`)
    .join("\n");
  const commentLines = (recentComments ?? []).map((c, i) => `Comment ${i + 1}: ${c}`).join("\n\n");

  return [
    `Title: ${card.name}`,
    card.desc ? `Description:\n${card.desc}` : "Description: (empty)",
    labelNames.length ? `Labels: ${labelNames.join(", ")}` : "",
    card.due ? `Due: ${card.due}${card.dueComplete ? " (marked complete)" : ""}` : "",
    checklistText ? `Checklists:\n${checklistText}` : "",
    attachmentLines ? `Attachments:\n${attachmentLines}` : "",
    commentLines ? `Recent comments:\n${commentLines}` : "",
    `Trello card URL: ${card.url ?? card.shortUrl ?? "(unknown)"}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function withRetry<T>(fn: (extraSystem?: string) => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof NoObjectGeneratedError) {
      try {
        return await fn("STRICT: Return ONLY valid JSON matching the schema. No prose. No markdown fences.");
      } catch (err2) {
        const text = err2 instanceof NoObjectGeneratedError ? err2.text : undefined;
        throw new AIParseError("Prompt generation failed: model output did not match schema after retry.", text);
      }
    }
    throw err;
  }
}

export interface PromptGenerationResult {
  prompt: GeneratedPrompt;
  resolved: ResolvedModel;
}

export async function generatePromptForCard(ctx: CardContext): Promise<PromptGenerationResult> {
  const resolved = await getActiveModel();
  const rendered = renderCardForPrompt(ctx);
  const result = await withRetry(async (extraSystem) =>
    generateObject({
      model: resolved.model,
      schema: GeneratedPromptSchema,
      system: SYSTEM_PROMPT + (extraSystem ? `\n\n${extraSystem}` : ""),
      prompt: `Generate a delegation prompt for this single Trello card. The "sourceCardIds" array MUST contain exactly: ["${ctx.card.id}"].\n\n${rendered}`,
    }),
  );
  return { prompt: result.object, resolved };
}

export interface GroupedContext {
  listName: string;
  cards: CardContext[];
}

export async function generateGroupedPrompt(group: GroupedContext): Promise<PromptGenerationResult> {
  const resolved = await getActiveModel();
  const cardSection = group.cards
    .map((c, i) => `=== Card ${i + 1} (id: ${c.card.id}) ===\n${renderCardForPrompt(c)}`)
    .join("\n\n");
  const ids = group.cards.map((c) => c.card.id);

  const result = await withRetry(async (extraSystem) =>
    generateObject({
      model: resolved.model,
      schema: GeneratedPromptSchema,
      system: SYSTEM_PROMPT + (extraSystem ? `\n\n${extraSystem}` : ""),
      prompt: `Generate ONE combined delegation prompt that covers all the cards from the Trello list "${group.listName}". Merge related work into a coherent set of acceptance criteria; preserve every checklist item. Surface conflicts in openQuestions. The "sourceCardIds" array MUST be exactly: ${JSON.stringify(ids)}.\n\n${cardSection}`,
    }),
  );
  return { prompt: result.object, resolved };
}
