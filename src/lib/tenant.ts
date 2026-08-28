import "server-only";

import { asc, eq } from "drizzle-orm";
import { cache } from "react";

import { getDb } from "@/db";
import {
  appUsers,
  branches,
  companies,
  companyMemberships,
} from "@/db/schema";

export const getTenantContext = cache(async (authUserId: string) => {
  const db = getDb();

  const [context] = await db
    .select({
      userId: appUsers.id,
      userName: appUsers.name,
      companyId: companies.id,
      companyName: companies.name,
      companySlug: companies.slug,
      timezone: companies.timezone,
      currency: companies.currency,
      role: companyMemberships.role,
    })
    .from(appUsers)
    .innerJoin(
      companyMemberships,
      eq(companyMemberships.userId, appUsers.id),
    )
    .innerJoin(companies, eq(companies.id, companyMemberships.companyId))
    .where(eq(appUsers.authUserId, authUserId))
    .orderBy(asc(companies.name))
    .limit(1);

  if (!context) return null;

  const [branch] = await db
    .select({ id: branches.id, name: branches.name, timezone: branches.timezone })
    .from(branches)
    .where(eq(branches.companyId, context.companyId))
    .orderBy(asc(branches.name))
    .limit(1);

  return { ...context, branch: branch ?? null };
});
