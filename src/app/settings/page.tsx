import { readConfig } from "@/lib/config/store";
import { getProviderAvailability } from "@/lib/providers/registry";
import { ProviderPicker } from "@/components/provider-picker";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const config = await readConfig();
  const availability = getProviderAvailability();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure which AI provider Trello2Prompt uses. API keys live in <code className="font-mono text-xs">.env.local</code>.
        </p>
      </div>
      <ProviderPicker initialConfig={config} initialAvailability={availability} />
    </div>
  );
}
