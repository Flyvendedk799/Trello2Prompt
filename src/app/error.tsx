"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GlobalRouteError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="mx-auto max-w-2xl border-destructive/40">
      <CardHeader>
        <CardTitle>Something went wrong</CardTitle>
        <CardDescription className="font-mono text-xs">{error.message}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={reset}>Try again</Button>
      </CardContent>
    </Card>
  );
}
