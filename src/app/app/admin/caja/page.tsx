import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { AdminCompanyPicker } from "@/components/admin-company-picker";
import { AdminPageHeader } from "@/components/admin-page-header";
import { CashDashboard } from "@/components/cash-dashboard";
import { getDb } from "@/db";
import { companies } from "@/db/schema";
import { getCashData } from "@/lib/commerce-data";

export const metadata: Metadata = { title: "Caja | Superadministración" };
export default async function AdminCashPage({ searchParams }: { searchParams: Promise<{ companyId?: string }> }) { const query = await searchParams; const rows = await getDb().select({ id: companies.id, name: companies.name, currency: companies.currency }).from(companies).where(eq(companies.status, "active")).orderBy(asc(companies.name)); const selected = rows.find((row) => row.id === query.companyId); const data = selected ? await getCashData(selected.id) : null; return <main className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8"><AdminPageHeader eyebrow="Control financiero" title="Caja" description="Opera y supervisa cajas por empresa y sucursal." /><AdminCompanyPicker companies={rows} selectedId={selected?.id} />{selected && data ? <CashDashboard companyId={selected.id} currency={selected.currency} data={data} /> : null}</main>; }
