import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AppointmentCalendarView } from "@/components/appointment-calendar-view";
import { getDb } from "@/db";
import { branches, companies } from "@/db/schema";

export const metadata: Metadata = { title: "Calendario de citas | Superadministración" };

export default async function AdminBranchAppointmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ branchId: string }>;
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const [{ branchId }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(branchId).success) notFound();

  const [branch] = await getDb()
    .select({
      id: branches.id,
      name: branches.name,
      timezone: branches.timezone,
      companyId: companies.id,
      companyTimezone: companies.timezone,
    })
    .from(branches)
    .innerJoin(companies, eq(companies.id, branches.companyId))
    .where(eq(branches.id, branchId))
    .limit(1);
  if (!branch) notFound();

  return (
    <AppointmentCalendarView
      companyId={branch.companyId}
      branch={branch}
      companyTimezone={branch.companyTimezone}
      basePath={`/app/admin/citas/${branch.id}`}
      selectedDate={typeof query.date === "string" ? query.date : undefined}
      selectorHref="/app/admin/citas"
      listHref="/app/admin/citas/listado"
      canManageAppointments
    />
  );
}
