import { NextResponse } from "next/server";
import { getProviderAvailability } from "@/lib/providers/registry";
import { hasTrelloCredentials } from "@/lib/trello/client";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    trello: hasTrelloCredentials(),
    providers: getProviderAvailability(),
  });
}
