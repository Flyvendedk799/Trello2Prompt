"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BoardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="mx-auto max-w-2xl border-destructive/40">
      <CardHeader>
        <CardTitle>Something went wrong loading this board</CardTitle>
        <CardDescription className="font-mono text-xs">{error.message}</CardDescription>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Back to boards</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
