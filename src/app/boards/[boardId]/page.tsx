import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BoardWorkspace } from "@/components/board-workspace";
import { TrelloError } from "@/lib/errors";
import { getBoardSnapshot, hasTrelloCredentials } from "@/lib/trello/client";
import { readConfig } from "@/lib/config/store";
import { getProviderAvailability } from "@/lib/providers/registry";

export const dynamic = "force-dynamic";

export default async function BoardDetailPage({ params }: { params: Promise<{ boardId: string }> }) {
  const { boardId } = await params;

  if (!hasTrelloCredentials()) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Connect Trello first</CardTitle>
          <CardDescription>
            Add <code className="font-mono text-xs">TRELLO_API_KEY</code> and{" "}
            <code className="font-mono text-xs">TRELLO_TOKEN</code> to <code className="font-mono text-xs">.env.local</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/">Back to boards</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  let snapshot;
  try {
    snapshot = await getBoardSnapshot(boardId);
  } catch (err) {
    const message = err instanceof TrelloError ? err.userMessage() : err instanceof Error ? err.message : "Unknown error";
    return (
      <Card className="mx-auto max-w-2xl border-destructive/40">
        <CardHeader>
          <CardTitle>Board could not be loaded</CardTitle>
          <CardDescription className="font-mono text-xs">{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/">Back to boards</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const config = await readConfig();
  const availability = getProviderAvailability();

  return (
    <BoardWorkspace
      board={snapshot.board}
      lists={snapshot.lists}
      cards={snapshot.cards}
      labels={snapshot.labels}
      config={config}
      availability={availability}
    />
  );
}
