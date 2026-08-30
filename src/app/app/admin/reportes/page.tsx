import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";

import { AdminPageHeader } from "@/components/admin-page-header";
import { ReportsDashboard } from "@/components/reports-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDb } from "@/db";
import { companies } from "@/db/schema";
import { getReportBranches, getReportData, normalizeReportFilters } from "@/lib/report-data";

export const metadata: Metadata = { title: "Reportes | Superadministración" };

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; branchId?: string; companyId?: string }> }) {
  const raw = await searchParams;
  const companyRows = await getDb().select({ id: companies.id, name: companies.name }).from(companies).where(eq(companies.status, "active")).orderBy(asc(companies.name));
  const companyId = companyRows.some((row) => row.id === raw.companyId) ? raw.companyId : undefined;
  const filters = normalizeReportFilters({ ...raw, companyId });
  const [report, branches] = await Promise.all([getReportData(filters), getReportBranches(companyId)]);
  const exportParams = new URLSearchParams({ from: filters.from, to: filters.to, ...(filters.companyId ? { companyId: filters.companyId } : {}), ...(filters.branchId ? { branchId: filters.branchId } : {}) }).toString();
  return <main className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8"><AdminPageHeader eyebrow="Inteligencia de negocio" title="Reportes" description="Analiza toda la plataforma o limita los resultados a una empresa." /><Card className="mb-6"><CardContent><form className="flex flex-col gap-3 sm:flex-row"><select name="companyId" defaultValue={companyId ?? ""} className="h-9 min-w-72 rounded-lg border border-input bg-white px-3 text-sm"><option value="">Todas las empresas</option>{companyRows.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select><Button type="submit">Seleccionar empresa</Button></form></CardContent></Card><ReportsDashboard report={report} branches={branches.map((row) => ({ id: row.id, name: companyId ? row.name : `${row.companyName} · ${row.name}` }))} exportParams={exportParams} /></main>;
}
