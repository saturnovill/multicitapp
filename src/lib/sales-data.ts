import "server-only";

import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";

import { getDb } from "@/db";
import {
  appointmentServices,
  appointments,
  branches,
  companies,
  customers,
  cashRegisterSessions,
  employeeBranches,
  employees,
  giftCards,
  saleItems,
  salePayments,
  sales,
  services,
} from "@/db/schema";

export async function getSaleSetup(companyId: string) {
  const db = getDb();
  const [companyRows, branchRows, customerRows, serviceRows, employeeRows, appointmentRows, cashSessions, giftCardRows] = await Promise.all([
    db.select({ id: companies.id, name: companies.name, currency: companies.currency }).from(companies).where(eq(companies.id, companyId)).limit(1),
    db.select({ id: branches.id, name: branches.name }).from(branches).where(and(eq(branches.companyId, companyId), eq(branches.status, "active"))).orderBy(asc(branches.name)),
    db.select({ id: customers.id, name: customers.name, phone: customers.phone }).from(customers).where(eq(customers.companyId, companyId)).orderBy(asc(customers.name)).limit(1000),
    db.select({ id: services.id, code: services.code, name: services.name, priceCents: services.priceCents }).from(services).where(and(eq(services.companyId, companyId), eq(services.status, "active"))).orderBy(asc(services.name)),
    db.select({ id: employees.id, name: employees.name, branchId: employeeBranches.branchId }).from(employees).innerJoin(employeeBranches, and(eq(employeeBranches.companyId, companyId), eq(employeeBranches.employeeId, employees.id))).where(and(eq(employees.companyId, companyId), eq(employees.status, "active"))).orderBy(asc(employees.name)),
    db.select({ id: appointments.id, branchId: appointments.branchId, customerId: appointments.customerId, employeeId: appointments.employeeId, startsAt: appointments.startsAt, status: appointments.status, customerName: customers.name }).from(appointments).innerJoin(customers, and(eq(customers.companyId, companyId), eq(customers.id, appointments.customerId))).where(and(eq(appointments.companyId, companyId), inArray(appointments.status, ["pending", "confirmed", "waiting", "in_service"]))).orderBy(desc(appointments.startsAt)).limit(250),
    db.select({ id: cashRegisterSessions.id, branchId: cashRegisterSessions.branchId }).from(cashRegisterSessions).where(and(eq(cashRegisterSessions.companyId, companyId), eq(cashRegisterSessions.status, "open"))),
    db.select({ id: giftCards.id, code: giftCards.code, balanceCents: giftCards.balanceCents, expiresOn: giftCards.expiresOn }).from(giftCards).where(and(eq(giftCards.companyId, companyId), eq(giftCards.status, "active"))).orderBy(asc(giftCards.code)),
  ]);
  const appointmentIds = appointmentRows.map((row) => row.id);
  const appointmentServiceRows = appointmentIds.length
    ? await db.select({ appointmentId: appointmentServices.appointmentId, serviceId: appointmentServices.serviceId }).from(appointmentServices).where(and(eq(appointmentServices.companyId, companyId), inArray(appointmentServices.appointmentId, appointmentIds)))
    : [];
  return { company: companyRows[0] ?? null, branches: branchRows, customers: customerRows, services: serviceRows, employees: employeeRows, appointments: appointmentRows, appointmentServices: appointmentServiceRows, cashSessions, giftCards: giftCardRows };
}

export type SaleListFilters = { from?: string; to?: string; branchId?: string };

export async function getSales(companyId?: string, filters: SaleListFilters = {}) {
  const conditions: SQL[] = [];
  const branchId = filters.branchId && /^[0-9a-f-]{36}$/i.test(filters.branchId) ? filters.branchId : undefined;
  if (companyId) conditions.push(eq(sales.companyId, companyId));
  if (branchId) conditions.push(eq(sales.branchId, branchId));
  if (filters.from && /^\d{4}-\d{2}-\d{2}$/.test(filters.from)) conditions.push(sql`(${sales.createdAt} at time zone coalesce(${branches.timezone}, ${companies.timezone}))::date >= ${filters.from}::date`);
  if (filters.to && /^\d{4}-\d{2}-\d{2}$/.test(filters.to)) conditions.push(sql`(${sales.createdAt} at time zone coalesce(${branches.timezone}, ${companies.timezone}))::date <= ${filters.to}::date`);
  return getDb().select({ id: sales.id, companyId: sales.companyId, folio: sales.folio, status: sales.status, totalCents: sales.totalCents, currency: sales.currency, createdAt: sales.createdAt, companyName: companies.name, branchName: branches.name, customerName: customers.name }).from(sales).innerJoin(companies, eq(companies.id, sales.companyId)).innerJoin(branches, and(eq(branches.companyId, sales.companyId), eq(branches.id, sales.branchId))).leftJoin(customers, and(eq(customers.companyId, sales.companyId), eq(customers.id, sales.customerId))).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(sales.createdAt)).limit(500);
}

export async function getSaleDetail(companyId: string, saleId: string) {
  const db = getDb();
  const [saleRows, items, payments] = await Promise.all([
    db.select({ id: sales.id, companyId: sales.companyId, branchId: sales.branchId, folio: sales.folio, status: sales.status, subtotalCents: sales.subtotalCents, discountCents: sales.discountCents, taxCents: sales.taxCents, totalCents: sales.totalCents, paidCents: sales.paidCents, changeCents: sales.changeCents, currency: sales.currency, notes: sales.notes, appointmentId: sales.appointmentId, createdAt: sales.createdAt, cancelledAt: sales.cancelledAt, cancellationReason: sales.cancellationReason, companyName: companies.name, branchName: branches.name, customerName: customers.name }).from(sales).innerJoin(companies, eq(companies.id, sales.companyId)).innerJoin(branches, and(eq(branches.companyId, sales.companyId), eq(branches.id, sales.branchId))).leftJoin(customers, and(eq(customers.companyId, sales.companyId), eq(customers.id, sales.customerId))).where(and(eq(sales.companyId, companyId), eq(sales.id, saleId))).limit(1),
    db.select().from(saleItems).where(and(eq(saleItems.companyId, companyId), eq(saleItems.saleId, saleId))).orderBy(asc(saleItems.createdAt)),
    db.select().from(salePayments).where(and(eq(salePayments.companyId, companyId), eq(salePayments.saleId, saleId))).orderBy(asc(salePayments.createdAt)),
  ]);
  return saleRows[0] ? { sale: saleRows[0], items, payments } : null;
}
