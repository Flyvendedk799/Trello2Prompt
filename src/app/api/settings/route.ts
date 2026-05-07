import { NextResponse } from "next/server";
import { z } from "zod";
import { readConfig, writeConfig } from "@/lib/config/store";
import { AppConfigSchema } from "@/lib/config/schema";
import { getProviderAvailability, PROVIDERS } from "@/lib/providers/registry";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  activeProvider: z.enum(PROVIDERS).optional(),
  activeModelId: z.string().optional(),
});

export async function GET() {
  const config = await readConfig();
  const availability = getProviderAvailability();
  return NextResponse.json({ config, availability });
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });
  }
  const next = await writeConfig((current) => {
    if (parsed.data.activeProvider !== undefined) current.activeProvider = parsed.data.activeProvider;
    if (parsed.data.activeModelId !== undefined) current.activeModelId = parsed.data.activeModelId;
    return current;
  });
  // re-validate to be safe
  const validated = AppConfigSchema.parse(next);
  return NextResponse.json({ config: validated, availability: getProviderAvailability() });
}
