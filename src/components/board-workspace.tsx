"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ListOverrides } from "@/components/list-overrides";
import { PromptCard } from "@/components/prompt-card";
import type { TrelloBoard, TrelloCard, TrelloLabel, TrelloList } from "@/lib/trello/schemas";
import type { AppConfig, PerBoardSettings, PromptMode } from "@/lib/config/schema";
import type { ProviderAvailability } from "@/lib/providers/registry";
import type { GeneratedPrompt } from "@/lib/ai/schemas";
import { selectActionableCards } from "@/lib/cards/select-actionable";

interface Props {
  board: TrelloBoard;
  lists: TrelloList[];
  cards: TrelloCard[];
  labels: TrelloLabel[];
  config: AppConfig;
  availability: ProviderAvailability;
}

interface PromptResult {
  prompt: GeneratedPrompt;
  provider: string;
  modelId: string;
}

export function BoardWorkspace({ board, lists, cards, labels, config, availability }: Props) {
  const [settings, setSettings] = useState<PerBoardSettings | undefined>(config.perBoardSettings[board.id]);
  const [analyzing, startAnalyzing] = useTransition();
  const [generating, startGenerating] = useTransition();
  const [results, setResults] = useState<PromptResult[]>([]);
  const [mode, setMode] = useState<PromptMode>(settings?.promptMode ?? "per-card");

  const cardLookup = useMemo(() => new Map(cards.map((c) => [c.id, c] as const)), [cards]);
  const cardCountByList = useMemo(() => {
    const out: Record<string, number> = {};
    for (const c of cards) out[c.idList] = (out[c.idList] ?? 0) + 1;
    return out;
  }, [cards]);

  const actionableCount = useMemo(
    () => (settings ? selectActionableCards(cards, settings).length : 0),
    [cards, settings],
  );

  const providerOk = availability[config.activeProvider];
  const modelLabel = config.activeModelId || "(default)";

  const analyze = () => {
    if (!providerOk) {
      toast.error(`Active provider "${config.activeProvider}" has no key configured. See /settings.`);
      return;
    }
    startAnalyzing(async () => {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ boardId: board.id }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; rawText?: string };
        toast.error(body.error ?? "Analysis failed", { description: body.rawText });
        return;
      }
      const data = (await res.json()) as { settings: PerBoardSettings };
      setSettings(data.settings);
      toast.success("Board analyzed. Review the verdicts and generate prompts.");
    });
  };

  const persistMode = async (next: PromptMode) => {
    setMode(next);
    await fetch(`/api/boards/${board.id}/settings`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ promptMode: next }),
    });
  };

  const generate = () => {
    if (!providerOk) {
      toast.error(`Active provider "${config.activeProvider}" has no key configured. See /settings.`);
      return;
    }
    if (!settings || actionableCount === 0) {
      toast.error("No actionable cards. Set overrides first or run Analyze.");
      return;
    }
    startGenerating(async () => {
      setResults([]);
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ boardId: board.id, mode }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; rawText?: string };
        toast.error(body.error ?? "Generation failed", { description: body.rawText });
        return;
      }
      const data = (await res.json()) as { prompts: PromptResult[] };
      setResults(data.prompts);
      if (data.prompts.length === 0) toast.message("No prompts generated.");
      else toast.success(`Generated ${data.prompts.length} prompt${data.prompts.length === 1 ? "" : "s"}.`);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{board.name}</h1>
          <p className="text-sm text-muted-foreground">
            {lists.length} lists · {cards.length} open cards · {labels.filter((l) => l.name).length} labels
          </p>
        </div>
        <div className="flex items-center gap-2">
          {board.url ? (
            <Button asChild variant="ghost" size="sm">
              <a href={board.url} target="_blank" rel="noreferrer">
                Open in Trello <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          ) : null}
          <Button onClick={analyze} disabled={analyzing} variant="outline">
            <Sparkles className="h-4 w-4" />
            {analyzing ? "Analyzing…" : settings?.lastAnalysis ? "Re-analyze" : "Analyze board"}
          </Button>
        </div>
      </div>

      {!providerOk ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">Active AI provider has no key</CardTitle>
            <CardDescription>
              Provider <span className="font-mono">{config.activeProvider}</span> is selected in{" "}
              <Link href="/settings" className="underline underline-offset-2">
                Settings
              </Link>{" "}
              but no key was found in <code className="font-mono text-xs">.env.local</code>. Add it and restart{" "}
              <code className="font-mono text-xs">npm run dev</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {settings?.lastAnalysis ? (
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Analysis
              <Badge variant={settings.lastAnalysis.confidence === "high" ? "success" : settings.lastAnalysis.confidence === "low" ? "warning" : "secondary"}>
                confidence: {settings.lastAnalysis.confidence}
              </Badge>
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              {settings.lastAnalysis.provider} / {settings.lastAnalysis.modelId} ·{" "}
              {new Date(settings.lastAnalysis.analyzedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{settings.lastAnalysis.reasoning}</p>
          </CardContent>
        </Card>
      ) : null}

      <ListOverrides
        boardId={board.id}
        lists={lists}
        labels={labels}
        cardCountByList={cardCountByList}
        settings={settings}
        onSaved={(s) => setSettings(s)}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Generate prompts
          </CardTitle>
          <CardDescription>
            {actionableCount === 0
              ? "No actionable cards yet. Check some lists or labels above."
              : `${actionableCount} actionable card${actionableCount === 1 ? "" : "s"} ready for prompt generation.`}{" "}
            Using <span className="font-mono">{config.activeProvider}</span> /{" "}
            <span className="font-mono">{modelLabel}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-md border p-1 text-sm">
              <button
                type="button"
                onClick={() => persistMode("per-card")}
                className={`rounded-sm px-3 py-1 ${mode === "per-card" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                One per card
              </button>
              <button
                type="button"
                onClick={() => persistMode("grouped")}
                className={`rounded-sm px-3 py-1 ${mode === "grouped" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Grouped per list
              </button>
            </div>
            <Button onClick={generate} disabled={generating || actionableCount === 0 || !providerOk}>
              <Wand2 className="h-4 w-4" />
              {generating ? "Generating…" : "Generate prompts"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {generating ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: Math.min(actionableCount || 2, 4) }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : results.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {results.map((r, i) => (
            <PromptCard
              key={i}
              prompt={r.prompt}
              provider={r.provider}
              modelId={r.modelId}
              cardLookup={cardLookup}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
