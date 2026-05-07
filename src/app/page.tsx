import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProviderAvailability } from "@/lib/providers/registry";
import { hasTrelloCredentials, getBoards } from "@/lib/trello/client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!hasTrelloCredentials()) {
    return <NoTrelloCreds />;
  }

  let boards;
  try {
    boards = await getBoards();
  } catch (error) {
    return <TrelloError message={error instanceof Error ? error.message : "Unknown error"} />;
  }

  if (boards.length === 0) {
    return <NoBoards />;
  }

  const availability = getProviderAvailability();
  const anyProvider = Object.values(availability).some(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your boards</h1>
          <p className="text-sm text-muted-foreground">Pick one to analyze and generate prompts.</p>
        </div>
        {!anyProvider && (
          <Button asChild variant="outline" size="sm">
            <Link href="/settings">Configure AI provider</Link>
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {boards.map((b) => (
          <Card key={b.id} className="transition-colors hover:border-foreground/30">
            <CardHeader>
              <CardTitle className="line-clamp-2 text-base">{b.name}</CardTitle>
              {b.desc ? <CardDescription className="line-clamp-2">{b.desc}</CardDescription> : null}
            </CardHeader>
            <CardContent className="flex justify-between">
              <Button asChild size="sm">
                <Link href={`/boards/${b.id}`}>Open</Link>
              </Button>
              {b.url ? (
                <Button asChild variant="ghost" size="sm">
                  <a href={b.url} target="_blank" rel="noreferrer">
                    Trello <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function NoTrelloCreds() {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>Connect Trello</CardTitle>
        <CardDescription>
          Add <code className="font-mono text-xs">TRELLO_API_KEY</code> and{" "}
          <code className="font-mono text-xs">TRELLO_TOKEN</code> to <code className="font-mono text-xs">.env.local</code>, then restart{" "}
          <code className="font-mono text-xs">npm run dev</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button asChild>
          <a href="https://trello.com/app-key" target="_blank" rel="noreferrer">
            Get key + token <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </Button>
        <Button asChild variant="outline">
          <Link href="/settings">Open settings</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function TrelloError({ message }: { message: string }) {
  return (
    <Card className="mx-auto max-w-2xl border-destructive/40">
      <CardHeader>
        <CardTitle>Trello request failed</CardTitle>
        <CardDescription className="font-mono text-xs">{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          If your token was rejected (401), regenerate it at{" "}
          <a
            href="https://trello.com/app-key"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            trello.com/app-key
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}

function NoBoards() {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>No boards yet</CardTitle>
        <CardDescription>
          Your Trello account has no open boards. Create one at{" "}
          <a href="https://trello.com" target="_blank" rel="noreferrer" className="underline underline-offset-2">
            trello.com
          </a>{" "}
          and refresh this page.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
