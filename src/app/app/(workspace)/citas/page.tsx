import type { Metadata } from "next";
import { and, asc, count, eq } from "drizzle-orm";
import Link from "next/link";
import { CalendarDays, ListFilter } from "lucide-react";
import { redirect } from "next/navigation";

import { BranchSelector } from "@/components/branch-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { branches, employeeBranches } from "@/db/schema";
import { getDb } from "@/db";
import { getAuthSession } from "@/lib/auth/server";
import { getTenantContext } from "@/lib/tenant";

export const metadata: Metadata = { title: "Citas" };

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const { data: session } = await getAuthSession();
  if (!session?.user) redirect("/login");

  const context = await getTenantContext(session.user.id);
  if (!context) redirect("/app/sin-acceso");

  const { date } = await searchParams;
  const selectedDate = typeof date === "string" ? date : undefined;

  if (context.role !== "manager") {
    if (!context.branch) throw new Error("La empresa no tiene una sucursal activa");
    const target = `/app/citas/${context.branch.id}`;
    redirect(selectedDate ? `${target}?date=${encodeURIComponent(selectedDate)}` : target);
  }

  const branchRows = await getDb()
    .select({
      id: branches.id,
      name: branches.name,
      timezone: branches.timezone,
      employeeCount: count(employeeBranches.id),
    })
    .from(branches)
    .leftJoin(
      employeeBranches,
      and(
        eq(employeeBranches.branchId, branches.id),
        eq(employeeBranches.companyId, context.companyId),
      ),
    )
    .where(and(eq(branches.companyId, context.companyId), eq(branches.status, "active")))
    .groupBy(branches.id, branches.name, branches.timezone)
    .orderBy(asc(branches.name));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><Badge variant="secondary"><CalendarDays /> Citas</Badge><h1 className="mt-3 text-3xl font-semibold tracking-tight">Selecciona una sucursal</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Elige la ubicación cuyo calendario diario deseas consultar. Podrás cambiarla en cualquier momento.</p></div>
        <Button variant="outline" asChild><Link href="/app/citas/listado"><ListFilter />Ver listado</Link></Button>
      </header>
      <BranchSelector
        branches={branchRows.map((branch) => ({
          id: branch.id,
          name: branch.name,
          companyName: context.companyName,
          employeeCount: branch.employeeCount,
          timezone: branch.timezone ?? context.timezone,
          href: `/app/citas/${branch.id}`,
        }))}
      />
    </div>
  );
}
