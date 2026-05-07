"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { PerBoardSettings } from "@/lib/config/schema";
import type { TrelloLabel, TrelloList } from "@/lib/trello/schemas";

interface Props {
  boardId: string;
  lists: TrelloList[];
  labels: TrelloLabel[];
  cardCountByList: Record<string, number>;
  settings: PerBoardSettings | undefined;
  onSaved: (next: PerBoardSettings) => void;
}

function VerdictBadge({ verdict }: { verdict: "actionable" | "not-actionable" | "uncertain" }) {
  if (verdict === "actionable") return <Badge variant="success">actionable</Badge>;
  if (verdict === "uncertain") return <Badge variant="warning">uncertain</Badge>;
  return <Badge variant="secondary">not actionable</Badge>;
}

export function ListOverrides({ boardId, lists, labels, cardCountByList, settings, onSaved }: Props) {
  const [listIds, setListIds] = useState<Set<string>>(new Set(settings?.actionableListIds ?? []));
  const [labelIds, setLabelIds] = useState<Set<string>>(new Set(settings?.actionableLabelIds ?? []));
  const [isPending, startTransition] = useTransition();

  const notesByList = useMemo(() => {
    const map = new Map<string, { verdict: "actionable" | "not-actionable" | "uncertain"; why: string }>();
    for (const note of settings?.lastAnalysis?.perListNotes ?? []) {
      map.set(note.listId, { verdict: note.verdict, why: note.why });
    }
    return map;
  }, [settings?.lastAnalysis]);

  const toggle = (set: Set<string>, id: string, on: boolean): Set<string> => {
    const next = new Set(set);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  };

  const save = () => {
    startTransition(async () => {
      const res = await fetch(`/api/boards/${boardId}/settings`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          actionableListIds: Array.from(listIds),
          actionableLabelIds: Array.from(labelIds),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Failed to save overrides");
        return;
      }
      const data = (await res.json()) as { settings: PerBoardSettings };
      onSaved(data.settings);
      toast.success("Overrides saved");
    });
  };

  const namedLabels = labels.filter((l) => l.name);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Actionable lists &amp; labels</CardTitle>
        <CardDescription>
          A card counts as actionable if it sits in any checked list, OR carries any checked label.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lists</div>
          <div className="space-y-2">
            {lists.map((list) => {
              const note = notesByList.get(list.id);
              const checked = listIds.has(list.id);
              return (
                <label
                  key={list.id}
                  className="flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 hover:bg-accent/50"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => setListIds((s) => toggle(s, list.id, Boolean(v)))}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="truncate">{list.name}</span>
                      <span className="text-xs text-muted-foreground">({cardCountByList[list.id] ?? 0} cards)</span>
                      {note ? <VerdictBadge verdict={note.verdict} /> : null}
                    </div>
                    {note?.why ? (
                      <div className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
                        <Info className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>{note.why}</span>
                      </div>
                    ) : null}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <Separator />

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Labels</div>
          {namedLabels.length === 0 ? (
            <div className="text-xs text-muted-foreground">This board has no named labels.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {namedLabels.map((label) => {
                const checked = labelIds.has(label.id);
                return (
                  <label
                    key={label.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-sm ${
                      checked ? "border-foreground/40 bg-accent" : "hover:bg-accent/50"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => setLabelIds((s) => toggle(s, label.id, Boolean(v)))}
                    />
                    <span>{label.name}</span>
                    {label.color ? (
                      <span className="text-xs text-muted-foreground">({label.color})</span>
                    ) : null}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={isPending}>
            {isPending ? "Saving…" : "Save overrides"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
