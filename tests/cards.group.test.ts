import { describe, expect, it } from "vitest";
import { groupCardsByList } from "@/lib/cards/group";
import type { TrelloCard, TrelloList } from "@/lib/trello/schemas";

const list = (id: string, name: string, pos = 0): TrelloList => ({ id, name, closed: false, pos });
const card = (id: string, idList: string): TrelloCard =>
  ({
    id,
    name: id,
    idList,
    desc: "",
    closed: false,
    idBoard: "b1",
    idLabels: [],
    idMembers: [],
    idChecklists: [],
    labels: [],
    due: null,
    dueComplete: false,
  }) as TrelloCard;

describe("groupCardsByList", () => {
  it("groups cards by their list", () => {
    const out = groupCardsByList(
      [card("a", "L1"), card("b", "L1"), card("c", "L2")],
      [list("L1", "First", 1), list("L2", "Second", 2)],
    );
    expect(out.map((g) => [g.list.id, g.cards.map((c) => c.id)])).toEqual([
      ["L1", ["a", "b"]],
      ["L2", ["c"]],
    ]);
  });

  it("orders groups by list position", () => {
    const out = groupCardsByList(
      [card("a", "L1"), card("b", "L2")],
      [list("L1", "First", 10), list("L2", "Second", 5)],
    );
    expect(out.map((g) => g.list.id)).toEqual(["L2", "L1"]);
  });

  it("skips groups for unknown lists", () => {
    const out = groupCardsByList([card("a", "ghost")], [list("L1", "Real", 1)]);
    expect(out).toEqual([]);
  });
});
