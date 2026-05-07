import type { TrelloCard, TrelloList } from "@/lib/trello/schemas";

export interface CardGroup {
  list: TrelloList;
  cards: TrelloCard[];
}

export function groupCardsByList(cards: TrelloCard[], lists: TrelloList[]): CardGroup[] {
  const listById = new Map(lists.map((l) => [l.id, l] as const));
  const grouped = new Map<string, TrelloCard[]>();
  for (const card of cards) {
    const arr = grouped.get(card.idList) ?? [];
    arr.push(card);
    grouped.set(card.idList, arr);
  }
  const result: CardGroup[] = [];
  for (const [listId, listCards] of grouped) {
    const list = listById.get(listId);
    if (!list) continue;
    result.push({ list, cards: listCards });
  }
  result.sort((a, b) => (a.list.pos ?? 0) - (b.list.pos ?? 0));
  return result;
}
