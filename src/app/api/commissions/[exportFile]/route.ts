import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db";
import { commissionAdjustments, commissionEntries, commissionRuns, employees } from "@/db/schema";
import { auth } from "@/lib/auth/server";
import { canManageCommissions, requireCompanyOperator } from "@/lib/company-operator";

const csv = (value: unknown) => { const raw = String(value ?? ""); const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw; return `"${safe.replaceAll('"', '""')}"`; };

export async function GET(_request: Request, { params }: { params: Promise<{ exportFile: string }> }) {
  try {
    const { data: session } = await auth.getSession();
    if (!session?.user) return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    const exportFile = (await params).exportFile;
    const runId = exportFile.endsWith(".csv") ? exportFile.slice(0, -4) : exportFile;
    if (!z.uuid().safeParse(runId).success) return NextResponse.json({ message: "Cálculo no encontrado" }, { status: 404 });
    const db = getDb();
    const [run] = await db.select().from(commissionRuns).where(eq(commissionRuns.id, runId)).limit(1);
    if (!run) return NextResponse.json({ message: "Cálculo no encontrado" }, { status: 404 });
    const operator = await requireCompanyOperator(run.companyId);
    if (!canManageCommissions(operator)) return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    const [entries, adjustments] = await Promise.all([
      db.select({ employeeId: commissionEntries.employeeId, employeeName: employees.name, baseCents: commissionEntries.baseCents, commissionCents: commissionEntries.commissionCents }).from(commissionEntries).innerJoin(employees, and(eq(employees.companyId, commissionEntries.companyId), eq(employees.id, commissionEntries.employeeId))).where(and(eq(commissionEntries.companyId, run.companyId), eq(commissionEntries.runId, run.id))),
      db.select({ employeeId: commissionAdjustments.employeeId, employeeName: employees.name, amountCents: commissionAdjustments.amountCents, reason: commissionAdjustments.reason }).from(commissionAdjustments).innerJoin(employees, and(eq(employees.companyId, commissionAdjustments.companyId), eq(employees.id, commissionAdjustments.employeeId))).where(and(eq(commissionAdjustments.companyId, run.companyId), eq(commissionAdjustments.runId, run.id))),
    ]);
    const summary = new Map<string, { name: string; base: number; commission: number; adjustments: number }>();
    for (const row of entries) { const value = summary.get(row.employeeId) ?? { name: row.employeeName, base: 0, commission: 0, adjustments: 0 }; value.base += row.baseCents; value.commission += row.commissionCents; summary.set(row.employeeId, value); }
    for (const row of adjustments) { const value = summary.get(row.employeeId) ?? { name: row.employeeName, base: 0, commission: 0, adjustments: 0 }; value.adjustments += row.amountCents; summary.set(row.employeeId, value); }
    const lines = [["Empleado", "Base", "Comisión", "Ajustes", "Total"], ...[...summary.values()].map((row) => [row.name, row.base / 100, row.commission / 100, row.adjustments / 100, (row.commission + row.adjustments) / 100]), [], ["Ajustes", "Motivo", "Importe"], ...adjustments.map((row) => [row.employeeName, row.reason, row.amountCents / 100])];
    return new NextResponse(`\uFEFF${lines.map((line) => line.map(csv).join(",")).join("\r\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="comisiones-${run.periodFrom}-${run.periodTo}.csv"`, "Cache-Control": "private, no-store" } });
  } catch (error) { console.error("[commissions:csv] failed", { error: String(error) }); return NextResponse.json({ message: "No autorizado" }, { status: 401 }); }
}
