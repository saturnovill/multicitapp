import "server-only";

import { and, asc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";

import { getDb } from "@/db";
import { appointments, branches, companies, employeeBranches, employees, saleItems, salePayments, sales, scheduleExceptions, weeklySchedules } from "@/db/schema";

export type ReportFilters = { from: string; to: string; branchId?: string; companyId?: string };

export function normalizeReportFilters(input: { from?: string; to?: string; branchId?: string; companyId?: string }): ReportFilters {
  const today = new Date();
  const first = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const valid = (value?: string) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
  const uuid = (value?: string) => value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : undefined;
  return { from: valid(input.from) ?? first.toISOString().slice(0, 10), to: valid(input.to) ?? today.toISOString().slice(0, 10), branchId: uuid(input.branchId), companyId: uuid(input.companyId) };
}

export async function getReportData(filters: ReportFilters) {
  const saleConditions: SQL[] = [
    sql`(${sales.createdAt} at time zone coalesce(${branches.timezone}, ${companies.timezone}))::date >= ${filters.from}::date`,
    sql`(${sales.createdAt} at time zone coalesce(${branches.timezone}, ${companies.timezone}))::date <= ${filters.to}::date`,
  ];
  const appointmentConditions: SQL[] = [
    sql`(${appointments.startsAt} at time zone coalesce(${branches.timezone}, ${companies.timezone}))::date >= ${filters.from}::date`,
    sql`(${appointments.startsAt} at time zone coalesce(${branches.timezone}, ${companies.timezone}))::date <= ${filters.to}::date`,
  ];
  if (filters.companyId) { saleConditions.push(eq(sales.companyId, filters.companyId)); appointmentConditions.push(eq(appointments.companyId, filters.companyId)); }
  if (filters.branchId) { saleConditions.push(eq(sales.branchId, filters.branchId)); appointmentConditions.push(eq(appointments.branchId, filters.branchId)); }
  const db = getDb();
  const assignmentConditions: SQL[] = [eq(employees.status, "active")];
  if (filters.companyId) assignmentConditions.push(eq(employees.companyId, filters.companyId));
  if (filters.branchId) assignmentConditions.push(eq(employeeBranches.branchId, filters.branchId));
  const [saleRows, appointmentRows, assignmentRows] = await Promise.all([
    db.select({ id: sales.id, companyId: sales.companyId, branchId: sales.branchId, status: sales.status, totalCents: sales.totalCents, currency: sales.currency, createdAt: sales.createdAt, companyName: companies.name, branchName: branches.name }).from(sales).innerJoin(companies, eq(companies.id, sales.companyId)).innerJoin(branches, and(eq(branches.companyId, sales.companyId), eq(branches.id, sales.branchId))).where(and(...saleConditions)),
    db.select({ id: appointments.id, companyId: appointments.companyId, branchId: appointments.branchId, employeeId: appointments.employeeId, status: appointments.status, startsAt: appointments.startsAt, endsAt: appointments.endsAt, companyName: companies.name, branchName: branches.name, employeeName: employees.name }).from(appointments).innerJoin(companies, eq(companies.id, appointments.companyId)).innerJoin(branches, and(eq(branches.companyId, appointments.companyId), eq(branches.id, appointments.branchId))).innerJoin(employees, and(eq(employees.companyId, appointments.companyId), eq(employees.id, appointments.employeeId))).where(and(...appointmentConditions)),
    db.select({ companyId: employeeBranches.companyId, branchId: employeeBranches.branchId, employeeId: employeeBranches.employeeId }).from(employeeBranches).innerJoin(employees, and(eq(employees.companyId, employeeBranches.companyId), eq(employees.id, employeeBranches.employeeId))).where(and(...assignmentConditions)),
  ]);
  const companyIds = [...new Set(assignmentRows.map((row) => row.companyId))];
  const [scheduleRows, exceptionRows] = companyIds.length ? await Promise.all([
    db.select({ companyId: weeklySchedules.companyId, branchId: weeklySchedules.branchId, employeeId: weeklySchedules.employeeId, scope: weeklySchedules.scope, dayOfWeek: weeklySchedules.dayOfWeek, startMinute: weeklySchedules.startMinute, endMinute: weeklySchedules.endMinute }).from(weeklySchedules).where(and(inArray(weeklySchedules.companyId, companyIds), eq(weeklySchedules.isActive, true))),
    db.select({ companyId: scheduleExceptions.companyId, branchId: scheduleExceptions.branchId, employeeId: scheduleExceptions.employeeId, type: scheduleExceptions.type, startsAt: scheduleExceptions.startsAt, endsAt: scheduleExceptions.endsAt }).from(scheduleExceptions).where(and(inArray(scheduleExceptions.companyId, companyIds), lte(scheduleExceptions.startsAt, new Date(`${filters.to}T23:59:59.999Z`)), gte(scheduleExceptions.endsAt, new Date(`${filters.from}T00:00:00.000Z`)))),
  ]) : [[], []];
  const activeSales = saleRows.filter((row) => row.status === "completed");
  const saleIds = activeSales.map((row) => row.id);
  const [itemRows, paymentRows] = saleIds.length ? await Promise.all([
    db.select({ saleId: saleItems.saleId, serviceId: saleItems.serviceId, serviceName: saleItems.serviceName, employeeId: saleItems.employeeId, employeeName: saleItems.employeeName, quantity: saleItems.quantity, totalCents: saleItems.lineTotalCents }).from(saleItems).where(inArray(saleItems.saleId, saleIds)),
    db.select({ saleId: salePayments.saleId, method: salePayments.method, amountCents: salePayments.amountCents }).from(salePayments).where(inArray(salePayments.saleId, saleIds)),
  ]) : [[], []];

  const revenueCents = activeSales.reduce((sum, row) => sum + row.totalCents, 0);
  const appointmentMinutes = appointmentRows.filter((row) => !["cancelled", "no_show"].includes(row.status)).reduce((sum, row) => sum + Math.max(0, Math.round((row.endsAt.getTime() - row.startsAt.getTime()) / 60_000)), 0);
  const weekdayCounts = countWeekdays(filters.from, filters.to);
  let capacityMinutes = 0;
  for (const assignment of assignmentRows) {
    let assignmentCapacity = 0;
    for (let day = 0; day < 7; day += 1) {
      const employeeSchedule = scheduleRows.filter((row) => row.companyId === assignment.companyId && row.branchId === assignment.branchId && row.employeeId === assignment.employeeId && row.dayOfWeek === day);
      const applicable = employeeSchedule.length ? employeeSchedule : scheduleRows.filter((row) => row.companyId === assignment.companyId && row.branchId === assignment.branchId && row.scope === "branch" && row.dayOfWeek === day);
      assignmentCapacity += applicable.reduce((sum, row) => sum + row.endMinute - row.startMinute, 0) * weekdayCounts[day];
    }
    const unavailableMinutes = exceptionRows.filter((row) => row.companyId === assignment.companyId && row.branchId === assignment.branchId && (!row.employeeId || row.employeeId === assignment.employeeId) && row.type !== "special_hours").reduce((sum, row) => {
      const start = Math.max(row.startsAt.getTime(), new Date(`${filters.from}T00:00:00.000Z`).getTime());
      const end = Math.min(row.endsAt.getTime(), new Date(`${filters.to}T23:59:59.999Z`).getTime());
      return sum + Math.max(0, Math.round((end - start) / 60_000));
    }, 0);
    capacityMinutes += Math.max(0, assignmentCapacity - unavailableMinutes);
  }
  const serviceMap = new Map<string, { name: string; quantity: number; totalCents: number }>();
  const employeeMap = new Map<string, { name: string; quantity: number; totalCents: number }>();
  for (const item of itemRows) {
    const service = serviceMap.get(item.serviceId) ?? { name: item.serviceName, quantity: 0, totalCents: 0 };
    service.quantity += item.quantity; service.totalCents += item.totalCents; serviceMap.set(item.serviceId, service);
    const employee = employeeMap.get(item.employeeId) ?? { name: item.employeeName, quantity: 0, totalCents: 0 };
    employee.quantity += item.quantity; employee.totalCents += item.totalCents; employeeMap.set(item.employeeId, employee);
  }
  const branchMap = new Map<string, { name: string; companyName: string; sales: number; totalCents: number }>();
  for (const sale of activeSales) { const row = branchMap.get(sale.branchId) ?? { name: sale.branchName, companyName: sale.companyName, sales: 0, totalCents: 0 }; row.sales += 1; row.totalCents += sale.totalCents; branchMap.set(sale.branchId, row); }
  const appointmentStatuses = Object.fromEntries(["pending", "confirmed", "waiting", "in_service", "completed", "cancelled", "no_show"].map((status) => [status, appointmentRows.filter((row) => row.status === status).length]));
  const paymentMethods = Object.fromEntries(["cash", "card", "transfer", "giftcard"].map((method) => [method, paymentRows.filter((row) => row.method === method).reduce((sum, row) => sum + row.amountCents, 0)]));
  const currencies = new Set(activeSales.map((row) => row.currency));
  const currency = activeSales[0]?.currency ?? "MXN";
  return {
    filters,
    currency,
    mixedCurrencies: currencies.size > 1,
    totals: { revenueCents, sales: activeSales.length, cancelledSales: saleRows.length - activeSales.length, averageTicketCents: activeSales.length ? Math.round(revenueCents / activeSales.length) : 0, appointments: appointmentRows.length, appointmentMinutes, capacityMinutes, occupancyPercent: capacityMinutes ? Math.round(appointmentMinutes / capacityMinutes * 1000) / 10 : 0, attendedAppointments: appointmentRows.filter((row) => ["in_service", "completed"].includes(row.status)).length },
    paymentMethods,
    appointmentStatuses,
    topServices: [...serviceMap.values()].sort((a, b) => b.totalCents - a.totalCents).slice(0, 10),
    topEmployees: [...employeeMap.values()].sort((a, b) => b.totalCents - a.totalCents).slice(0, 10),
    branches: [...branchMap.values()].sort((a, b) => b.totalCents - a.totalCents),
  };
}

function countWeekdays(from: string, to: string) {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  if (end < start) return counts;
  const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const fullWeeks = Math.floor(days / 7);
  counts.fill(fullWeeks);
  for (let offset = 0; offset < days % 7; offset += 1) counts[(start.getUTCDay() + offset) % 7] += 1;
  return counts;
}

export async function getReportBranches(companyId?: string) {
  return getDb().select({ id: branches.id, name: branches.name, companyName: companies.name }).from(branches).innerJoin(companies, eq(companies.id, branches.companyId)).where(companyId ? eq(branches.companyId, companyId) : undefined).orderBy(asc(companies.name), asc(branches.name));
}
