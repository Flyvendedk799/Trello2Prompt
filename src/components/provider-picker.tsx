"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PROVIDERS,
  PROVIDER_LABELS,
  PROVIDER_DEFAULT_MODELS,
  PROVIDER_ENV_VARS,
  type ProviderId,
  type ProviderAvailability,
} from "@/lib/providers/registry";
import type { AppConfig } from "@/lib/config/schema";

interface Props {
  initialConfig: AppConfig;
  initialAvailability: ProviderAvailability;
}

export function ProviderPicker({ initialConfig, initialAvailability }: Props) {
  const [provider, setProvider] = useState<ProviderId>(initialConfig.activeProvider);
  const [modelId, setModelId] = useState<string>(
    initialConfig.activeModelId || PROVIDER_DEFAULT_MODELS[initialConfig.activeProvider],
  );
  const [availability, setAvailability] = useState<ProviderAvailability>(initialAvailability);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!initialConfig.activeModelId) {
      setModelId(PROVIDER_DEFAULT_MODELS[provider]);
    }
  }, [provider, initialConfig.activeModelId]);

  const handleProviderChange = (next: string) => {
    const p = next as ProviderId;
    setProvider(p);
    setModelId(PROVIDER_DEFAULT_MODELS[p]);
  };

  const save = () => {
    startTransition(async () => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ activeProvider: provider, activeModelId: modelId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(body.error ?? "Failed to save settings");
        return;
      }
      const data = (await res.json()) as { availability: ProviderAvailability };
      setAvailability(data.availability);
      toast.success("Settings saved");
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Active AI provider</CardTitle>
          <CardDescription>
            Pick the model used for board analysis and prompt generation. Switches take effect on the next click.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select value={provider} onValueChange={handleProviderChange}>
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PROVIDER_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model ID</Label>
              <Input
                id="model"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder={PROVIDER_DEFAULT_MODELS[provider] || "e.g. llama3.1:8b"}
              />
            </div>
          </div>
          <Button onClick={save} disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provider availability</CardTitle>
          <CardDescription>
            Reflects whether the relevant env var is present in <code className="font-mono text-xs">.env.local</code>. Restart{" "}
            <code className="font-mono text-xs">npm run dev</code> after editing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {PROVIDERS.map((p) => {
            const ok = availability[p];
            return (
              <div key={p} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{PROVIDER_LABELS[p]}</div>
                  <div className="font-mono text-xs text-muted-foreground">{PROVIDER_ENV_VARS[p].join(", ")}</div>
                </div>
                {ok ? (
                  <Badge variant="success" className="gap-1">
                    <Check className="h-3 w-3" /> Configured
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <X className="h-3 w-3" /> Missing key
                  </Badge>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
