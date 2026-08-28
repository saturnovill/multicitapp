import type { Metadata } from "next";
import { and, asc, count, eq } from "drizzle-orm";
import Link from "next/link";
import { ListFilter } from "lucide-react";

import { AdminPageHeader } from "@/components/admin-page-header";
import { BranchSelector } from "@/components/branch-selector";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { branches, companies, employeeBranches } from "@/db/schema";

export const metadata: Metadata = { title: "Citas | Superadministración" };

export default async function AdminAppointmentsPage() {
  const branchRows = await getDb()
    .select({
      id: branches.id,
      name: branches.name,
      timezone: branches.timezone,
      companyName: companies.name,
      companyTimezone: companies.timezone,
      employeeCount: count(employeeBranches.id),
    })
    .from(branches)
    .innerJoin(companies, eq(companies.id, branches.companyId))
    .leftJoin(
      employeeBranches,
      and(
        eq(employeeBranches.branchId, branches.id),
        eq(employeeBranches.companyId, branches.companyId),
      ),
    )
    .where(and(eq(branches.status, "active"), eq(companies.status, "active")))
    .groupBy(
      branches.id,
      branches.name,
      branches.timezone,
      companies.name,
      companies.timezone,
    )
    .orderBy(asc(companies.name), asc(branches.name));

  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
      <AdminPageHeader
        eyebrow="Operación global"
        title="Citas"
        description="Selecciona una empresa y sucursal antes de abrir su calendario diario."
        action={<Button variant="outline" asChild><Link href="/app/admin/citas/listado"><ListFilter />Ver listado</Link></Button>}
      />
      <BranchSelector
        branches={branchRows.map((branch) => ({
          id: branch.id,
          name: branch.name,
          companyName: branch.companyName,
          employeeCount: branch.employeeCount,
          timezone: branch.timezone ?? branch.companyTimezone,
          href: `/app/admin/citas/${branch.id}`,
        }))}
      />
    </main>
  );
}
