import type { TrelloCard } from "@/lib/trello/schemas";
import type { PerBoardSettings } from "@/lib/config/schema";

export function selectActionableCards(cards: TrelloCard[], settings: PerBoardSettings): TrelloCard[] {
  const listIds = new Set(settings.actionableListIds);
  const labelIds = new Set(settings.actionableLabelIds);

  return cards.filter((card) => {
    if (card.closed) return false;
    if (card.dueComplete) return false;
    if (listIds.size > 0 && listIds.has(card.idList)) return true;
    if (labelIds.size > 0 && card.idLabels.some((id) => labelIds.has(id))) return true;
    return false;
  });
}
