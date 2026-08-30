import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth/server";
import { getAppUserByAuthId } from "@/lib/platform-admin";
import { getReportData, normalizeReportFilters } from "@/lib/report-data";
import { getTenantContext } from "@/lib/tenant";

const csv = (value: unknown) => {
  const raw = String(value ?? "");
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
};

export async function GET(request: Request) {
  const { data: session } = await getAuthSession();
  if (!session?.user) return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  const url = new URL(request.url);
  const user = await getAppUserByAuthId(session.user.id);
  const tenant = await getTenantContext(session.user.id);
  const requestedCompany = url.searchParams.get("companyId") ?? undefined;
  if (user?.platformRole !== "platform_admin" && !tenant) return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  const companyId = user?.platformRole === "platform_admin" ? requestedCompany : tenant!.companyId;
  const filters = normalizeReportFilters({ from: url.searchParams.get("from") ?? undefined, to: url.searchParams.get("to") ?? undefined, branchId: url.searchParams.get("branchId") ?? undefined, companyId });
  const report = await getReportData(filters);
  const lines = [
    ["Reporte", "Valor 1", "Valor 2"],
    ["Resumen", "Ventas netas", report.totals.revenueCents / 100],
    ["Resumen", "Numero de ventas", report.totals.sales],
    ["Resumen", "Ticket promedio", report.totals.averageTicketCents / 100],
    ["Resumen", "Citas", report.totals.appointments],
    ["Resumen", "Horas reservadas", Math.round(report.totals.appointmentMinutes / 6) / 10],
    ["Resumen", "Horas disponibles", Math.round(report.totals.capacityMinutes / 6) / 10],
    ["Resumen", "Ocupacion de agenda (%)", report.totals.occupancyPercent],
    ...report.topServices.map((row) => ["Servicio", row.name, `${row.quantity} | ${row.totalCents / 100}`]),
    ...report.topEmployees.map((row) => ["Empleado", row.name, `${row.quantity} | ${row.totalCents / 100}`]),
    ...report.branches.map((row) => ["Sucursal", `${row.companyName} - ${row.name}`, `${row.sales} | ${row.totalCents / 100}`]),
  ];
  return new NextResponse(`\uFEFF${lines.map((line) => line.map(csv).join(",")).join("\r\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="reporte-${filters.from}-${filters.to}.csv"`, "Cache-Control": "private, no-store" } });
}
