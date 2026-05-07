import { NextResponse } from "next/server";
import { getBoards, hasTrelloCredentials } from "@/lib/trello/client";
import { TrelloError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasTrelloCredentials()) {
    return NextResponse.json({ error: "Missing Trello credentials in .env.local" }, { status: 400 });
  }
  try {
    const boards = await getBoards();
    return NextResponse.json({ boards });
  } catch (err) {
    if (err instanceof TrelloError) {
      return NextResponse.json({ error: err.userMessage(), status: err.status }, { status: 502 });
    }
    return NextResponse.json({ error: "Unexpected error fetching boards" }, { status: 500 });
  }
}
