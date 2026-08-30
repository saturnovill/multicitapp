import "server-only";

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { authRateLimits } from "@/db/schema";

const WINDOW_MS = 15 * 60_000;
const BLOCK_MS = 30 * 60_000;
const MAX_ATTEMPTS = 8;

const hashKey = (value: string) => createHash("sha256").update(value).digest("hex");

export async function checkLoginRateLimit(identifier: string) {
  const keyHash = hashKey(identifier.toLowerCase());
  const [row] = await getDb().select().from(authRateLimits).where(eq(authRateLimits.keyHash, keyHash)).limit(1);
  const now = new Date();
  return { keyHash, blocked: Boolean(row?.blockedUntil && row.blockedUntil > now), retryAfterSeconds: row?.blockedUntil ? Math.max(1, Math.ceil((row.blockedUntil.getTime() - now.getTime()) / 1000)) : 0 };
}

export async function recordLoginResult(keyHash: string, succeeded: boolean) {
  const db = getDb();
  if (succeeded) {
    await db.delete(authRateLimits).where(eq(authRateLimits.keyHash, keyHash));
    return;
  }
  const [row] = await db.select().from(authRateLimits).where(eq(authRateLimits.keyHash, keyHash)).limit(1);
  const now = new Date();
  const expired = !row || now.getTime() - row.windowStartedAt.getTime() >= WINDOW_MS;
  const attempts = expired ? 1 : row.attempts + 1;
  const blockedUntil = attempts >= MAX_ATTEMPTS ? new Date(now.getTime() + BLOCK_MS) : null;
  await db.insert(authRateLimits).values({ keyHash, attempts, windowStartedAt: expired ? now : row.windowStartedAt, blockedUntil, updatedAt: now }).onConflictDoUpdate({ target: authRateLimits.keyHash, set: { attempts, windowStartedAt: expired ? now : row!.windowStartedAt, blockedUntil, updatedAt: now } });
}
