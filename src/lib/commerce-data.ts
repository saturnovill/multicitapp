import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { branches, cashMovements, cashRegisterSessions, commissionAdjustments, commissionEntries, commissionRules, commissionRuns, customers, employees, giftCardMovements, giftCards, serviceCategories, services } from "@/db/schema";

export async function getCashData(companyId: string) {
  const db = getDb();
  const [branchRows, sessionRows] = await Promise.all([
    db.select({ id: branches.id, name: branches.name }).from(branches).where(and(eq(branches.companyId, companyId), eq(branches.status, "active"))).orderBy(asc(branches.name)),
    db.select({ id: cashRegisterSessions.id, branchId: cashRegisterSessions.branchId, branchName: branches.name, status: cashRegisterSessions.status, openingBalanceCents: cashRegisterSessions.openingBalanceCents, expectedCashCents: cashRegisterSessions.expectedCashCents, countedCashCents: cashRegisterSessions.countedCashCents, differenceCents: cashRegisterSessions.differenceCents, openingNotes: cashRegisterSessions.openingNotes, closingNotes: cashRegisterSessions.closingNotes, openedAt: cashRegisterSessions.openedAt, closedAt: cashRegisterSessions.closedAt }).from(cashRegisterSessions).innerJoin(branches, and(eq(branches.companyId, cashRegisterSessions.companyId), eq(branches.id, cashRegisterSessions.branchId))).where(eq(cashRegisterSessions.companyId, companyId)).orderBy(desc(cashRegisterSessions.openedAt)).limit(100),
  ]);
  const sessionIds = sessionRows.map((row) => row.id);
  const movements = sessionIds.length ? await db.select({ id: cashMovements.id, sessionId: cashMovements.sessionId, saleId: cashMovements.saleId, type: cashMovements.type, method: cashMovements.method, amountCents: cashMovements.amountCents, category: cashMovements.category, reason: cashMovements.reason, occurredAt: cashMovements.occurredAt }).from(cashMovements).where(and(eq(cashMovements.companyId, companyId), inArray(cashMovements.sessionId, sessionIds))).orderBy(desc(cashMovements.occurredAt)).limit(1000) : [];
  return { branches: branchRows, sessions: sessionRows, movements };
}

export async function getGiftCardData(companyId: string) {
  const db = getDb();
  const [cards, customerRows] = await Promise.all([
    db.select({ id: giftCards.id, code: giftCards.code, customerId: giftCards.customerId, customerName: customers.name, initialBalanceCents: giftCards.initialBalanceCents, balanceCents: giftCards.balanceCents, currency: giftCards.currency, status: giftCards.status, expiresOn: giftCards.expiresOn, notes: giftCards.notes, createdAt: giftCards.createdAt }).from(giftCards).leftJoin(customers, and(eq(customers.companyId, giftCards.companyId), eq(customers.id, giftCards.customerId))).where(eq(giftCards.companyId, companyId)).orderBy(desc(giftCards.createdAt)).limit(500),
    db.select({ id: customers.id, name: customers.name }).from(customers).where(eq(customers.companyId, companyId)).orderBy(asc(customers.name)).limit(1000),
  ]);
  const cardIds = cards.map((card) => card.id);
  const movements = cardIds.length ? await db.select({ id: giftCardMovements.id, giftCardId: giftCardMovements.giftCardId, saleId: giftCardMovements.saleId, type: giftCardMovements.type, amountCents: giftCardMovements.amountCents, balanceAfterCents: giftCardMovements.balanceAfterCents, notes: giftCardMovements.notes, occurredAt: giftCardMovements.occurredAt }).from(giftCardMovements).where(and(eq(giftCardMovements.companyId, companyId), inArray(giftCardMovements.giftCardId, cardIds))).orderBy(desc(giftCardMovements.occurredAt)).limit(1500) : [];
  return { cards, customers: customerRows, movements };
}

export async function getCommissionData(companyId: string) {
  const db = getDb();
  const [rules, runs, employeeRows, serviceRows, categoryRows, branchRows] = await Promise.all([
    db.select({ id: commissionRules.id, name: commissionRules.name, employeeId: commissionRules.employeeId, employeeName: employees.name, serviceId: commissionRules.serviceId, serviceName: services.name, categoryId: commissionRules.categoryId, categoryName: serviceCategories.name, rateBasisPoints: commissionRules.rateBasisPoints, fixedCents: commissionRules.fixedCents, priority: commissionRules.priority, status: commissionRules.status }).from(commissionRules).leftJoin(employees, and(eq(employees.companyId, commissionRules.companyId), eq(employees.id, commissionRules.employeeId))).leftJoin(services, and(eq(services.companyId, commissionRules.companyId), eq(services.id, commissionRules.serviceId))).leftJoin(serviceCategories, and(eq(serviceCategories.companyId, commissionRules.companyId), eq(serviceCategories.id, commissionRules.categoryId))).where(eq(commissionRules.companyId, companyId)).orderBy(desc(commissionRules.priority), asc(commissionRules.name)),
    db.select({ id: commissionRuns.id, branchId: commissionRuns.branchId, branchName: branches.name, status: commissionRuns.status, periodFrom: commissionRuns.periodFrom, periodTo: commissionRuns.periodTo, totalCents: commissionRuns.totalCents, createdAt: commissionRuns.createdAt, approvedAt: commissionRuns.approvedAt }).from(commissionRuns).leftJoin(branches, and(eq(branches.companyId, commissionRuns.companyId), eq(branches.id, commissionRuns.branchId))).where(eq(commissionRuns.companyId, companyId)).orderBy(desc(commissionRuns.createdAt)).limit(100),
    db.select({ id: employees.id, name: employees.name }).from(employees).where(and(eq(employees.companyId, companyId), eq(employees.status, "active"))).orderBy(asc(employees.name)),
    db.select({ id: services.id, name: services.name }).from(services).where(and(eq(services.companyId, companyId), eq(services.status, "active"))).orderBy(asc(services.name)),
    db.select({ id: serviceCategories.id, name: serviceCategories.name }).from(serviceCategories).where(and(eq(serviceCategories.companyId, companyId), eq(serviceCategories.status, "active"))).orderBy(asc(serviceCategories.name)),
    db.select({ id: branches.id, name: branches.name }).from(branches).where(and(eq(branches.companyId, companyId), eq(branches.status, "active"))).orderBy(asc(branches.name)),
  ]);
  const runIds = runs.map((run) => run.id);
  const [entries, adjustments] = runIds.length ? await Promise.all([
    db.select({ runId: commissionEntries.runId, employeeId: commissionEntries.employeeId, employeeName: employees.name, baseCents: commissionEntries.baseCents, commissionCents: commissionEntries.commissionCents }).from(commissionEntries).innerJoin(employees, and(eq(employees.companyId, commissionEntries.companyId), eq(employees.id, commissionEntries.employeeId))).where(and(eq(commissionEntries.companyId, companyId), inArray(commissionEntries.runId, runIds))),
    db.select({ id: commissionAdjustments.id, runId: commissionAdjustments.runId, employeeId: commissionAdjustments.employeeId, employeeName: employees.name, amountCents: commissionAdjustments.amountCents, reason: commissionAdjustments.reason, createdAt: commissionAdjustments.createdAt }).from(commissionAdjustments).innerJoin(employees, and(eq(employees.companyId, commissionAdjustments.companyId), eq(employees.id, commissionAdjustments.employeeId))).where(and(eq(commissionAdjustments.companyId, companyId), inArray(commissionAdjustments.runId, runIds))).orderBy(desc(commissionAdjustments.createdAt)),
  ]) : [[], []];
  return { rules, runs, employees: employeeRows, services: serviceRows, categories: categoryRows, branches: branchRows, entries, adjustments };
}
