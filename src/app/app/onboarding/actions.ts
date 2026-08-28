"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import {
  appUsers,
  branches,
  companies,
  companyMemberships,
  employeeBranches,
  employees,
  weeklySchedules,
} from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { getTenantContext } from "@/lib/tenant";

const onboardingSchema = z.object({
  companyName: z.string().trim().min(2).max(160),
  branchName: z.string().trim().min(2).max(160),
  timezone: z.string().trim().min(3).max(80),
});

function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 72);
}

export async function createCompany(formData: FormData) {
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/login");

  if (await getTenantContext(session.user.id)) redirect("/app/agenda");

  const values = onboardingSchema.parse({
    companyName: formData.get("companyName"),
    branchName: formData.get("branchName"),
    timezone: formData.get("timezone"),
  });

  const db = getDb();
  const [existingUser] = await db
    .select({ id: appUsers.id })
    .from(appUsers)
    .where(eq(appUsers.authUserId, session.user.id))
    .limit(1);

  const userId = existingUser?.id ?? randomUUID();
  const companyId = randomUUID();
  const membershipId = randomUUID();
  const branchId = randomUUID();
  const employeeId = randomUUID();
  const suffix = companyId.slice(0, 6);

  const queries = [
    ...(existingUser
      ? []
      : [
          db.insert(appUsers).values({
            id: userId,
            authUserId: session.user.id,
            email: session.user.email,
            name: session.user.name,
            avatarUrl: session.user.image,
          }),
        ]),
    db.insert(companies).values({
      id: companyId,
      name: values.companyName,
      slug: `${toSlug(values.companyName) || "empresa"}-${suffix}`,
      timezone: values.timezone,
    }),
    db.insert(companyMemberships).values({
      id: membershipId,
      companyId,
      userId,
      role: "owner",
    }),
    db.insert(branches).values({
      id: branchId,
      companyId,
      name: values.branchName,
      slug: toSlug(values.branchName) || "principal",
      timezone: values.timezone,
    }),
    db.insert(employees).values({
      id: employeeId,
      companyId,
      userId,
      name: session.user.name,
      email: session.user.email,
      color: "#7c3aed",
    }),
    db.insert(employeeBranches).values({
      companyId,
      employeeId,
      branchId,
      isPrimary: true,
    }),
    ...[1, 2, 3, 4, 5].map((dayOfWeek) =>
      db.insert(weeklySchedules).values({
        companyId,
        branchId,
        employeeId,
        scope: "employee",
        dayOfWeek,
        startMinute: 540,
        endMinute: 1080,
      }),
    ),
  ];

  await db.batch(queries as [typeof queries[number], ...typeof queries]);
  redirect("/app/agenda");
}
