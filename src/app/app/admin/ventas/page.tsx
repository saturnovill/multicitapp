import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";

import { AdminPageHeader } from "@/components/admin-page-header";
import { SalesList } from "@/components/sales-list";
import { getDb } from "@/db";
import { branches, companies } from "@/db/schema";

export const metadata: Metadata = { title: "Ventas | Superadministración" };

export default async function AdminSalesPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; branchId?: string }> }) {
  const branchRows = await getDb().select({ id: branches.id, name: branches.name, companyName: companies.name }).from(branches).innerJoin(companies, eq(companies.id, branches.companyId)).orderBy(asc(companies.name), asc(branches.name));
  return <main className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8"><AdminPageHeader eyebrow="Operación global" title="Ventas" description="Consulta cobros, recibos y cancelaciones de todas las empresas." /><SalesList basePath="/app/admin/ventas" newHref="/app/admin/ventas/nueva" filters={await searchParams} branches={branchRows.map((row) => ({ id: row.id, name: `${row.companyName} · ${row.name}` }))} showCompany /></main>;
}
