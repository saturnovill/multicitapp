import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db";
import { appointments, branches, companies, customers, employees } from "@/db/schema";
import { getAuthSession } from "@/lib/auth/server";
import { getAppUserByAuthId } from "@/lib/platform-admin";
import { getTenantContext } from "@/lib/tenant";

const statuses = ["pending", "confirmed", "waiting", "in_service", "completed", "cancelled", "no_show"] as const;
const csv = (value: unknown) => { const raw = String(value ?? ""); const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw; return `"${safe.replaceAll('"', '""')}"`; };
const date = (value: string | null) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;

export async function GET(request: Request) {
  const { data: session } = await getAuthSession();
  if (!session?.user) return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  const [user, tenant] = await Promise.all([getAppUserByAuthId(session.user.id), getTenantContext(session.user.id)]);
  if (user?.platformRole !== "platform_admin" && !tenant) return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  const url = new URL(request.url); const conditions: SQL[] = [];
  if (user?.platformRole !== "platform_admin") conditions.push(eq(appointments.companyId, tenant!.companyId));
  const branchId = z.uuid().safeParse(url.searchParams.get("branchId")).data; if (branchId) conditions.push(eq(appointments.branchId, branchId));
  const status = z.enum(statuses).safeParse(url.searchParams.get("status")).data; if (status) conditions.push(eq(appointments.status, status));
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 100); if (q) conditions.push(or(ilike(customers.name, `%${q}%`), ilike(employees.name, `%${q}%`))!);
  const from = date(url.searchParams.get("from")); const to = date(url.searchParams.get("to"));
  if (from) conditions.push(sql`(${appointments.startsAt} at time zone coalesce(${branches.timezone}, ${companies.timezone}))::date >= ${from}::date`);
  if (to) conditions.push(sql`(${appointments.startsAt} at time zone coalesce(${branches.timezone}, ${companies.timezone}))::date <= ${to}::date`);
  const rows = await getDb().select({ startsAt: appointments.startsAt, endsAt: appointments.endsAt, status: appointments.status, totalCents: appointments.estimatedTotalCents, customer: customers.name, employee: employees.name, branch: branches.name, timezone: branches.timezone, company: companies.name, companyTimezone: companies.timezone, currency: companies.currency }).from(appointments).innerJoin(customers, and(eq(customers.id, appointments.customerId), eq(customers.companyId, appointments.companyId))).innerJoin(employees, and(eq(employees.id, appointments.employeeId), eq(employees.companyId, appointments.companyId))).innerJoin(branches, and(eq(branches.id, appointments.branchId), eq(branches.companyId, appointments.companyId))).innerJoin(companies, eq(companies.id, appointments.companyId)).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(appointments.startsAt)).limit(10_000);
  const lines = [["Empresa", "Sucursal", "Inicio", "Fin", "Cliente", "Empleado", "Estado", "Total", "Moneda"], ...rows.map((row) => { const timezone = row.timezone ?? row.companyTimezone; const formatter = new Intl.DateTimeFormat("es-MX", { timeZone: timezone, dateStyle: "short", timeStyle: "short" }); return [row.company, row.branch, formatter.format(row.startsAt), formatter.format(row.endsAt), row.customer, row.employee, row.status, row.totalCents / 100, row.currency]; })];
  return new NextResponse(`\uFEFF${lines.map((line) => line.map(csv).join(",")).join("\r\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="citas-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store" } });
}
