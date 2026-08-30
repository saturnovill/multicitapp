import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    await getDb().execute(sql`select 1 as healthy`);
    return NextResponse.json({ status: "ok", database: "reachable", latencyMs: Date.now() - startedAt, timestamp: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[health] database unavailable", { error: String(error) });
    return NextResponse.json({ status: "error", database: "unavailable", timestamp: new Date().toISOString() }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
