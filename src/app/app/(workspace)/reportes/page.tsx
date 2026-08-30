import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ReportsDashboard } from "@/components/reports-dashboard";
import { Badge } from "@/components/ui/badge";
import { getAuthSession } from "@/lib/auth/server";
import { getReportBranches, getReportData, normalizeReportFilters } from "@/lib/report-data";
import { getTenantContext } from "@/lib/tenant";

export const metadata: Metadata = { title: "Reportes" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; branchId?: string }> }) {
  const { data: session } = await getAuthSession();
  if (!session?.user) redirect("/login");
  const context = await getTenantContext(session.user.id);
  if (!context) redirect("/app/sin-acceso");
  const raw = await searchParams;
  const filters = normalizeReportFilters({ ...raw, companyId: context.companyId });
  const [report, branches] = await Promise.all([getReportData(filters), getReportBranches(context.companyId)]);
  const exportParams = new URLSearchParams({ from: filters.from, to: filters.to, ...(filters.branchId ? { branchId: filters.branchId } : {}) }).toString();
  return <div className="p-4 sm:p-6 lg:p-8"><header className="mb-7"><Badge variant="secondary">Análisis</Badge><h1 className="mt-3 text-3xl font-semibold tracking-tight">Reportes</h1><p className="mt-2 text-sm text-muted-foreground">Ventas, citas, ocupación, servicios y desempeño del equipo.</p></header><ReportsDashboard report={report} branches={branches.map((row) => ({ id: row.id, name: row.name }))} exportParams={exportParams} /></div>;
}
