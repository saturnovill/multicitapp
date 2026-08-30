import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth/server";
import { createTextPdf } from "@/lib/pdf";
import { getAppUserByAuthId } from "@/lib/platform-admin";
import { getReportData, normalizeReportFilters } from "@/lib/report-data";
import { getTenantContext } from "@/lib/tenant";

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
  const money = (cents: number) => report.mixedCurrencies ? `${new Intl.NumberFormat("es-MX", { minimumFractionDigits: 2 }).format(cents / 100)} (monedas mixtas)` : new Intl.NumberFormat("es-MX", { style: "currency", currency: report.currency }).format(cents / 100);
  const bytes = await createTextPdf("Reporte ejecutivo", [
    { text: `Periodo: ${filters.from} al ${filters.to}` },
    { text: "RESUMEN", bold: true, size: 13 },
    { text: `Ventas netas: ${money(report.totals.revenueCents)} | Ventas: ${report.totals.sales} | Canceladas: ${report.totals.cancelledSales}` },
    { text: `Ticket promedio: ${money(report.totals.averageTicketCents)}` },
    { text: `Citas: ${report.totals.appointments} | Atendidas: ${report.totals.attendedAppointments} | Horas reservadas: ${Math.round(report.totals.appointmentMinutes / 6) / 10}` },
    { text: " " },
    { text: "SERVICIOS", bold: true, size: 13 },
    ...report.topServices.map((row) => ({ text: `${row.name}: ${row.quantity} servicios | ${money(row.totalCents)}` })),
    { text: " " },
    { text: "EMPLEADOS", bold: true, size: 13 },
    ...report.topEmployees.map((row) => ({ text: `${row.name}: ${row.quantity} servicios | ${money(row.totalCents)}` })),
    { text: " " },
    { text: "SUCURSALES", bold: true, size: 13 },
    ...report.branches.map((row) => ({ text: `${row.companyName} - ${row.name}: ${row.sales} ventas | ${money(row.totalCents)}` })),
  ]);
  return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="reporte-${filters.from}-${filters.to}.pdf"`, "Cache-Control": "private, no-store" } });
}
