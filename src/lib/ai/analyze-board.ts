import { generateObject, NoObjectGeneratedError } from "ai";
import { getActiveModel, type ResolvedModel } from "@/lib/ai/model";
import { BoardAnalysisSchema, type BoardAnalysis } from "@/lib/ai/schemas";
import type { TrelloBoard, TrelloCard, TrelloLabel, TrelloList } from "@/lib/trello/schemas";
import { AIParseError } from "@/lib/errors";

const SYSTEM_PROMPT = `You are an assistant that classifies Trello board structures.

Given a board's lists, labels, and a few sample card titles per list, identify which lists and labels indicate "actionable engineering work that is ready to start."

Heuristics:
- Names like "To Do", "Sprint Ready", "Ready for Dev", "Backlog (Ready)", "Up Next" → actionable.
- "Doing", "In Progress", "Review", "Blocked", "Done", "Archive", "Ideas", "Reference" → NOT actionable.
- A label like "ready", "dev-ready", "engineering" → actionable.
- A label like "blocked", "needs-design", "wontfix" → NOT actionable.
- When uncertain, mark as "uncertain" and explain in the "why" field.
- Prefer high precision: if you cannot tell, do NOT mark as actionable.

Return ONLY structured JSON matching the provided schema.`;

interface AnalyzeInput {
  board: Pick<TrelloBoard, "id" | "name" | "desc">;
  lists: TrelloList[];
  labels: TrelloLabel[];
  cards: TrelloCard[];
}

function buildUserMessage(input: AnalyzeInput): string {
  const sampleByList = new Map<string, string[]>();
  for (const card of input.cards) {
    const arr = sampleByList.get(card.idList) ?? [];
    if (arr.length < 3) {
      arr.push(card.name);
      sampleByList.set(card.idList, arr);
    }
  }
  const listLines = input.lists.map((l) => {
    const samples = (sampleByList.get(l.id) ?? []).map((s) => `    • ${s}`).join("\n");
    return `- listId: ${l.id}\n  name: ${JSON.stringify(l.name)}\n  sampleCardTitles:\n${samples || "    (none)"}`;
  });
  const labelLines = input.labels
    .filter((l) => l.name)
    .map((l) => `- labelId: ${l.id}  name: ${JSON.stringify(l.name)}  color: ${l.color ?? "none"}`);

  return [
    `Board: ${JSON.stringify(input.board.name)}`,
    input.board.desc ? `Board description: ${input.board.desc.slice(0, 500)}` : "",
    "",
    "Lists:",
    ...listLines,
    "",
    labelLines.length ? "Labels:" : "Labels: (none)",
    ...labelLines,
  ]
    .filter(Boolean)
    .join("\n");
}

export interface BoardAnalysisResult {
  analysis: BoardAnalysis;
  resolved: ResolvedModel;
}

export async function analyzeBoard(input: AnalyzeInput): Promise<BoardAnalysisResult> {
  const resolved = await getActiveModel();
  const userMessage = buildUserMessage(input);

  const tryGenerate = async (extraSystem = "") => {
    return await generateObject({
      model: resolved.model,
      schema: BoardAnalysisSchema,
      system: SYSTEM_PROMPT + (extraSystem ? `\n\n${extraSystem}` : ""),
      prompt: userMessage,
    });
  };

  try {
    const { object } = await tryGenerate();
    return { analysis: object, resolved };
  } catch (err) {
    if (err instanceof NoObjectGeneratedError) {
      try {
        const { object } = await tryGenerate(
          "STRICT: Return ONLY valid JSON matching the schema. No prose. No markdown.",
        );
        return { analysis: object, resolved };
      } catch (err2) {
        const text = err2 instanceof NoObjectGeneratedError ? err2.text : undefined;
        throw new AIParseError("Board analysis failed: model output did not match schema after retry.", text);
      }
    }
    throw err;
  }
}
