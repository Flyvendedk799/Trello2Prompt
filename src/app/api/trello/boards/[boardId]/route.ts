import { NextResponse } from "next/server";
import { getBoardSnapshot, hasTrelloCredentials } from "@/lib/trello/client";
import { TrelloError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await ctx.params;
  if (!hasTrelloCredentials()) {
    return NextResponse.json({ error: "Missing Trello credentials in .env.local" }, { status: 400 });
  }
  try {
    const snapshot = await getBoardSnapshot(boardId);
    return NextResponse.json(snapshot);
  } catch (err) {
    if (err instanceof TrelloError) {
      return NextResponse.json({ error: err.userMessage(), status: err.status }, { status: 502 });
    }
    return NextResponse.json({ error: "Unexpected error fetching board" }, { status: 500 });
  }
}
