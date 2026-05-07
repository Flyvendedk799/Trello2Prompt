import { describe, expect, it } from "vitest";
import { selectActionableCards } from "@/lib/cards/select-actionable";
import type { TrelloCard } from "@/lib/trello/schemas";
import type { PerBoardSettings } from "@/lib/config/schema";

function card(partial: Partial<TrelloCard> & Pick<TrelloCard, "id" | "name" | "idList">): TrelloCard {
  return {
    desc: "",
    closed: false,
    idBoard: "b1",
    idLabels: [],
    idMembers: [],
    idChecklists: [],
    labels: [],
    due: null,
    dueComplete: false,
    ...partial,
  } as TrelloCard;
}

const settings = (s: Partial<PerBoardSettings>): PerBoardSettings => ({
  actionableListIds: [],
  actionableLabelIds: [],
  promptMode: "per-card",
  ...s,
});

describe("selectActionableCards", () => {
  it("includes cards in matching lists", () => {
    const cards = [card({ id: "1", name: "A", idList: "todo" }), card({ id: "2", name: "B", idList: "done" })];
    const out = selectActionableCards(cards, settings({ actionableListIds: ["todo"] }));
    expect(out.map((c) => c.id)).toEqual(["1"]);
  });

  it("includes cards with matching labels even if list is not actionable", () => {
    const cards = [card({ id: "1", name: "A", idList: "review", idLabels: ["lab-ready"] })];
    const out = selectActionableCards(cards, settings({ actionableLabelIds: ["lab-ready"] }));
    expect(out.map((c) => c.id)).toEqual(["1"]);
  });

  it("treats list and label as OR", () => {
    const cards = [
      card({ id: "1", name: "A", idList: "todo" }),
      card({ id: "2", name: "B", idList: "review", idLabels: ["lab-ready"] }),
      card({ id: "3", name: "C", idList: "review" }),
    ];
    const out = selectActionableCards(
      cards,
      settings({ actionableListIds: ["todo"], actionableLabelIds: ["lab-ready"] }),
    );
    expect(out.map((c) => c.id).sort()).toEqual(["1", "2"]);
  });

  it("excludes archived cards", () => {
    const cards = [card({ id: "1", name: "A", idList: "todo", closed: true })];
    const out = selectActionableCards(cards, settings({ actionableListIds: ["todo"] }));
    expect(out).toEqual([]);
  });

  it("excludes dueComplete cards", () => {
    const cards = [card({ id: "1", name: "A", idList: "todo", dueComplete: true, due: "2024-01-01" })];
    const out = selectActionableCards(cards, settings({ actionableListIds: ["todo"] }));
    expect(out).toEqual([]);
  });

  it("returns empty when no settings match", () => {
    const cards = [card({ id: "1", name: "A", idList: "todo" })];
    const out = selectActionableCards(cards, settings({}));
    expect(out).toEqual([]);
  });
});
