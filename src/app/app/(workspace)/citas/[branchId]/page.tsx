import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { AppointmentCalendarView } from "@/components/appointment-calendar-view";
import { getDb } from "@/db";
import { branches } from "@/db/schema";
import { getAuthSession } from "@/lib/auth/server";
import { getTenantContext } from "@/lib/tenant";

export const metadata: Metadata = { title: "Calendario de citas" };

export default async function BranchAppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const [{ branchId }, query, sessionResult] = await Promise.all([
    params,
    searchParams,
    getAuthSession(),
  ]);
  if (!sessionResult.data?.user) redirect("/login");
  if (!z.uuid().safeParse(branchId).success) notFound();

  const context = await getTenantContext(sessionResult.data.user.id);
  if (!context) redirect("/app/sin-acceso");

  const [branch] = await getDb()
    .select({ id: branches.id, name: branches.name, timezone: branches.timezone })
    .from(branches)
    .where(
      and(
        eq(branches.id, branchId),
        eq(branches.companyId, context.companyId),
        eq(branches.status, "active"),
      ),
    )
    .limit(1);
  if (!branch) notFound();

  if (context.role !== "manager" && context.branch?.id !== branch.id) {
    notFound();
  }

  return (
    <AppointmentCalendarView
      companyId={context.companyId}
      branch={branch}
      companyTimezone={context.timezone}
      basePath={`/app/citas/${branch.id}`}
      selectedDate={typeof query.date === "string" ? query.date : undefined}
      selectorHref={context.role === "manager" ? "/app/citas" : undefined}
      canManageAppointments={["owner", "admin", "manager", "receptionist"].includes(context.role)}
    />
  );
}
