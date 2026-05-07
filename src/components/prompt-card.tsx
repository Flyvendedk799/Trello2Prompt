"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { GeneratedPrompt } from "@/lib/ai/schemas";
import type { TrelloCard } from "@/lib/trello/schemas";

interface Props {
  prompt: GeneratedPrompt;
  provider: string;
  modelId: string;
  cardLookup: Map<string, TrelloCard>;
}

function buildClipboardText(prompt: GeneratedPrompt): string {
  const parts: string[] = [];
  parts.push(`# ${prompt.title}`, "");
  parts.push(prompt.prompt.trim(), "");
  if (prompt.acceptanceCriteria.length) {
    parts.push("## Acceptance criteria");
    for (const c of prompt.acceptanceCriteria) parts.push(`- ${c}`);
    parts.push("");
  }
  if (prompt.openQuestions.length) {
    parts.push("## Open questions");
    for (const q of prompt.openQuestions) parts.push(`- ${q}`);
    parts.push("");
  }
  return parts.join("\n").trim();
}

export function PromptCard({ prompt, provider, modelId, cardLookup }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildClipboardText(prompt));
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy. Your browser may block clipboard access.");
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <CardTitle className="line-clamp-2 text-base">{prompt.title}</CardTitle>
        <Button onClick={copy} variant={copied ? "secondary" : "default"} size="sm">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <pre className="whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
          {prompt.prompt.trim()}
        </pre>

        {prompt.acceptanceCriteria.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Acceptance criteria
            </div>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {prompt.acceptanceCriteria.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {prompt.openQuestions.length > 0 && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              <Badge variant="warning">{prompt.openQuestions.length}</Badge>
              Open questions for the agent
            </div>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {prompt.openQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      <Separator />
      <CardFooter className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <span>Source:</span>
          {prompt.sourceCardIds.map((id) => {
            const card = cardLookup.get(id);
            const href = card?.url ?? card?.shortUrl;
            const label = card?.name ?? id.slice(0, 8);
            return href ? (
              <a
                key={id}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
              >
                {label}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span key={id}>{label}</span>
            );
          })}
        </div>
        <div className="font-mono">
          using: {provider} / {modelId}
        </div>
      </CardFooter>
    </Card>
  );
}
