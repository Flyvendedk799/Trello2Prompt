import { z } from "zod";
import { TrelloError } from "@/lib/errors";
import {
  TrelloBoardSchema,
  TrelloCardSchema,
  TrelloLabelSchema,
  TrelloListSchema,
  TrelloChecklistSchema,
  TrelloActionCommentSchema,
  type TrelloBoard,
  type TrelloCard,
  type TrelloLabel,
  type TrelloList,
  type TrelloChecklist,
  type TrelloActionComment,
} from "@/lib/trello/schemas";

const BASE_URL = "https://api.trello.com/1";

export function hasTrelloCredentials() {
  return Boolean(process.env.TRELLO_API_KEY && process.env.TRELLO_TOKEN);
}

function authParams() {
  const key = process.env.TRELLO_API_KEY;
  const token = process.env.TRELLO_TOKEN;
  if (!key || !token) {
    throw new TrelloError("Missing TRELLO_API_KEY or TRELLO_TOKEN in .env.local", 401);
  }
  return { key, token };
}

async function trelloFetch<T>(
  pathSegment: string,
  params: Record<string, string | undefined> = {},
  schema?: z.ZodType<T>,
): Promise<T> {
  const { key, token } = authParams();
  const url = new URL(`${BASE_URL}${pathSegment}`);
  url.searchParams.set("key", key);
  url.searchParams.set("token", token);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) url.searchParams.set(k, v);
  }

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
      // ignore
    }
    const retryAfterHeader = res.headers.get("retry-after");
    const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : undefined;
    throw new TrelloError(body || res.statusText, res.status, pathSegment, Number.isFinite(retryAfter) ? retryAfter : undefined);
  }

  const json = await res.json();
  if (schema) {
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new TrelloError(`Trello response did not match schema: ${parsed.error.message}`, 200, pathSegment);
    }
    return parsed.data;
  }
  return json as T;
}

export async function getMe() {
  return trelloFetch("/members/me", { fields: "id,username,fullName" });
}

export async function getBoards(): Promise<TrelloBoard[]> {
  const boards = await trelloFetch<unknown>(
    "/members/me/boards",
    { filter: "open", fields: "id,name,desc,closed,url,shortUrl,dateLastActivity" },
    z.array(TrelloBoardSchema),
  );
  return (boards as TrelloBoard[]).filter((b) => !b.closed);
}

export async function getBoard(boardId: string): Promise<TrelloBoard> {
  return trelloFetch(
    `/boards/${boardId}`,
    { fields: "id,name,desc,closed,url,shortUrl,dateLastActivity" },
    TrelloBoardSchema,
  );
}

export async function getLists(boardId: string): Promise<TrelloList[]> {
  const lists = await trelloFetch<unknown>(
    `/boards/${boardId}/lists`,
    { filter: "open", fields: "id,name,closed,pos,idBoard" },
    z.array(TrelloListSchema),
  );
  return lists as TrelloList[];
}

export async function getCards(boardId: string): Promise<TrelloCard[]> {
  const cards = await trelloFetch<unknown>(
    `/boards/${boardId}/cards`,
    {
      filter: "open",
      fields:
        "id,name,desc,closed,idList,idBoard,idLabels,idMembers,idChecklists,labels,due,dueComplete,dateLastActivity,url,shortUrl,pos",
      attachments: "true",
      attachment_fields: "id,name,url",
      checklists: "all",
      checklist_fields: "id,name,checkItems",
    },
    z.array(TrelloCardSchema),
  );
  return cards as TrelloCard[];
}

export async function getLabels(boardId: string): Promise<TrelloLabel[]> {
  const labels = await trelloFetch<unknown>(
    `/boards/${boardId}/labels`,
    { fields: "id,name,color,idBoard", limit: "1000" },
    z.array(TrelloLabelSchema),
  );
  return labels as TrelloLabel[];
}

export async function getChecklists(cardId: string): Promise<TrelloChecklist[]> {
  const checklists = await trelloFetch<unknown>(
    `/cards/${cardId}/checklists`,
    { fields: "id,name", checkItem_fields: "id,name,state,pos" },
    z.array(TrelloChecklistSchema),
  );
  return checklists as TrelloChecklist[];
}

export async function getCommentsForCard(cardId: string, limit = 3): Promise<TrelloActionComment[]> {
  const actions = await trelloFetch<unknown>(
    `/cards/${cardId}/actions`,
    { filter: "commentCard", limit: String(Math.min(limit, 50)) },
    z.array(TrelloActionCommentSchema),
  );
  return actions as TrelloActionComment[];
}

export async function getBoardSnapshot(boardId: string) {
  const [board, lists, cards, labels] = await Promise.all([
    getBoard(boardId),
    getLists(boardId),
    getCards(boardId),
    getLabels(boardId),
  ]);
  const openCards = cards.filter((c) => !c.closed);
  return { board, lists, cards: openCards, labels };
}
