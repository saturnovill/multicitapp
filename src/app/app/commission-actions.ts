"use server";

import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import { auditLogs, branches, commissionAdjustments, commissionEntries, commissionRules, commissionRuns, companies, employees, saleItems, sales, services } from "@/db/schema";
import { canManageCommissions, requireCompanyOperator } from "@/lib/company-operator";
import type { FinanceActionState } from "@/app/app/cash-actions";

const ruleSchema = z.object({ companyId: z.uuid(), name: z.string().trim().min(2).max(160), employeeId: z.union([z.uuid(), z.literal("")]), serviceId: z.union([z.uuid(), z.literal("")]), categoryId: z.union([z.uuid(), z.literal("")]), rateBasisPoints: z.number().int().min(0).max(10_000), fixedCents: z.number().int().min(0).max(10_000_000), priority: z.number().int().min(-1000).max(1000) }).refine((row) => row.rateBasisPoints > 0 || row.fixedCents > 0, { message: "Captura un porcentaje o importe fijo" });
const runSchema = z.object({ companyId: z.uuid(), branchId: z.union([z.uuid(), z.literal("")]), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).refine((row) => row.from <= row.to, { message: "El periodo no es válido" });
const adjustmentSchema = z.object({ companyId: z.uuid(), runId: z.uuid(), employeeId: z.uuid(), amountCents: z.number().int().refine((value) => value !== 0), reason: z.string().trim().min(3).max(1000) });
const approveSchema = z.object({ companyId: z.uuid(), runId: z.uuid() });
const cents = (value: FormDataEntryValue | null) => Math.round(Number(value ?? 0) * 100);

export async function createCommissionRuleAction(_state: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  try {
    const parsed = ruleSchema.safeParse({ companyId: formData.get("companyId"), name: formData.get("name") ?? "", employeeId: formData.get("employeeId") ?? "", serviceId: formData.get("serviceId") ?? "", categoryId: formData.get("categoryId") ?? "", rateBasisPoints: Math.round(Number(formData.get("ratePercent") ?? 0) * 100), fixedCents: cents(formData.get("fixedAmount")), priority: Number(formData.get("priority") ?? 0) });
    if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canManageCommissions(operator)) return invalid("No tienes permiso para administrar comisiones");
    const db = getDb();
    const ruleId = randomUUID();
    await db.batch([
      db.insert(commissionRules).values({ id: ruleId, companyId: parsed.data.companyId, name: parsed.data.name, employeeId: parsed.data.employeeId || null, serviceId: parsed.data.serviceId || null, categoryId: parsed.data.categoryId || null, rateBasisPoints: parsed.data.rateBasisPoints, fixedCents: parsed.data.fixedCents, priority: parsed.data.priority }),
      db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: "commission_rule.created", entityType: "commission_rule", entityId: ruleId, metadata: { name: parsed.data.name, rateBasisPoints: parsed.data.rateBasisPoints, fixedCents: parsed.data.fixedCents } }),
    ]);
    revalidateCommissions();
    return { status: "success", message: "Regla de comisión creada" };
  } catch (error) { console.error("[commissions:rule] failed", { error: String(error) }); return invalid("No fue posible crear la regla"); }
}

export async function toggleCommissionRuleAction(_state: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  try {
    const parsed = z.object({ companyId: z.uuid(), ruleId: z.uuid() }).safeParse({ companyId: formData.get("companyId"), ruleId: formData.get("ruleId") });
    if (!parsed.success) return invalid("La regla no es válida");
    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canManageCommissions(operator)) return invalid("No tienes permiso para modificar reglas");
    const db = getDb();
    const [rule] = await db.select({ status: commissionRules.status }).from(commissionRules).where(and(eq(commissionRules.companyId, parsed.data.companyId), eq(commissionRules.id, parsed.data.ruleId))).limit(1);
    if (!rule) return invalid("La regla no existe");
    const status = rule.status === "active" ? "inactive" : "active";
    await db.batch([db.update(commissionRules).set({ status, updatedAt: new Date() }).where(and(eq(commissionRules.companyId, parsed.data.companyId), eq(commissionRules.id, parsed.data.ruleId))), db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: "commission_rule.status_changed", entityType: "commission_rule", entityId: parsed.data.ruleId, metadata: { status } })]);
    revalidateCommissions();
    return { status: "success", message: status === "active" ? "Regla activada" : "Regla desactivada" };
  } catch (error) { console.error("[commissions:toggle] failed", { error: String(error) }); return invalid("No fue posible modificar la regla"); }
}

export async function calculateCommissionRunAction(_state: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  try {
    const parsed = runSchema.safeParse({ companyId: formData.get("companyId"), branchId: formData.get("branchId") ?? "", from: formData.get("from"), to: formData.get("to") });
    if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canManageCommissions(operator)) return invalid("No tienes permiso para calcular comisiones");
    const db = getDb();
    if (parsed.data.branchId) {
      const [branch] = await db.select({ id: branches.id }).from(branches).where(and(eq(branches.companyId, parsed.data.companyId), eq(branches.id, parsed.data.branchId))).limit(1);
      if (!branch) return invalid("La sucursal no pertenece a esta empresa");
    }
    const [rules, itemRows] = await Promise.all([
      db.select().from(commissionRules).where(and(eq(commissionRules.companyId, parsed.data.companyId), eq(commissionRules.status, "active"))).orderBy(desc(commissionRules.priority)),
      db.select({ saleId: sales.id, saleItemId: saleItems.id, employeeId: saleItems.employeeId, serviceId: saleItems.serviceId, categoryId: services.categoryId, lineTotalCents: saleItems.lineTotalCents, subtotalCents: sales.subtotalCents, discountCents: sales.discountCents, quantity: saleItems.quantity }).from(saleItems).innerJoin(sales, and(eq(sales.companyId, saleItems.companyId), eq(sales.id, saleItems.saleId))).innerJoin(services, and(eq(services.companyId, saleItems.companyId), eq(services.id, saleItems.serviceId))).innerJoin(branches, and(eq(branches.companyId, sales.companyId), eq(branches.id, sales.branchId))).innerJoin(companies, eq(companies.id, sales.companyId)).where(and(eq(sales.companyId, parsed.data.companyId), eq(sales.status, "completed"), parsed.data.branchId ? eq(sales.branchId, parsed.data.branchId) : undefined, sql`(${sales.createdAt} at time zone coalesce(${branches.timezone}, ${companies.timezone}))::date >= ${parsed.data.from}::date`, sql`(${sales.createdAt} at time zone coalesce(${branches.timezone}, ${companies.timezone}))::date <= ${parsed.data.to}::date`)),
    ]);
    const entries = itemRows.flatMap((item) => {
      const applicable = rules.filter((rule) => (!rule.employeeId || rule.employeeId === item.employeeId) && (!rule.serviceId || rule.serviceId === item.serviceId) && (!rule.categoryId || rule.categoryId === item.categoryId)).sort((a, b) => {
        const specificity = (rule: typeof a) => Number(Boolean(rule.employeeId)) + Number(Boolean(rule.serviceId)) + Number(Boolean(rule.categoryId));
        return specificity(b) - specificity(a) || b.priority - a.priority;
      })[0];
      if (!applicable) return [];
      const baseCents = item.subtotalCents ? Math.round(item.lineTotalCents * (item.subtotalCents - item.discountCents) / item.subtotalCents) : 0;
      const commissionCents = Math.round(baseCents * applicable.rateBasisPoints / 10_000) + applicable.fixedCents * item.quantity;
      return [{ ...item, baseCents, ruleId: applicable.id, commissionCents }];
    });
    const runId = randomUUID();
    const totalCents = entries.reduce((sum, row) => sum + row.commissionCents, 0);
    const queries = [
      db.insert(commissionRuns).values({ id: runId, companyId: parsed.data.companyId, branchId: parsed.data.branchId || null, createdByUserId: operator.appUserId, periodFrom: parsed.data.from, periodTo: parsed.data.to, totalCents }),
      ...entries.map((entry) => db.insert(commissionEntries).values({ companyId: parsed.data.companyId, runId, employeeId: entry.employeeId, saleId: entry.saleId, saleItemId: entry.saleItemId, ruleId: entry.ruleId, baseCents: entry.baseCents, commissionCents: entry.commissionCents })),
      db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: "commission_run.calculated", entityType: "commission_run", entityId: runId, metadata: { from: parsed.data.from, to: parsed.data.to, branchId: parsed.data.branchId || null, entries: entries.length, totalCents } }),
    ];
    await db.batch(queries as [typeof queries[number], ...typeof queries]);
    revalidateCommissions();
    return { status: "success", message: `Cálculo creado con ${entries.length} partidas` };
  } catch (error) { console.error("[commissions:calculate] failed", { error: String(error) }); return invalid("No fue posible calcular las comisiones"); }
}

export async function addCommissionAdjustmentAction(_state: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  try {
    const parsed = adjustmentSchema.safeParse({ companyId: formData.get("companyId"), runId: formData.get("runId"), employeeId: formData.get("employeeId"), amountCents: cents(formData.get("amount")), reason: formData.get("reason") ?? "" });
    if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canManageCommissions(operator)) return invalid("No tienes permiso para ajustar comisiones");
    const db = getDb();
    const [run, employee] = await Promise.all([
      db.select({ status: commissionRuns.status, totalCents: commissionRuns.totalCents }).from(commissionRuns).where(and(eq(commissionRuns.companyId, parsed.data.companyId), eq(commissionRuns.id, parsed.data.runId))).limit(1),
      db.select({ id: employees.id }).from(employees).where(and(eq(employees.companyId, parsed.data.companyId), eq(employees.id, parsed.data.employeeId))).limit(1),
    ]);
    if (!run.length || run[0].status !== "draft") return invalid("El cálculo no está disponible para ajustes");
    if (!employee.length) return invalid("El empleado no pertenece a esta empresa");
    const totalCents = run[0].totalCents + parsed.data.amountCents;
    if (totalCents < 0) return invalid("El ajuste dejaría el cálculo con total negativo");
    await db.batch([
      db.insert(commissionAdjustments).values({ companyId: parsed.data.companyId, runId: parsed.data.runId, employeeId: parsed.data.employeeId, actorUserId: operator.appUserId, amountCents: parsed.data.amountCents, reason: parsed.data.reason }),
      db.update(commissionRuns).set({ totalCents, updatedAt: new Date() }).where(and(eq(commissionRuns.companyId, parsed.data.companyId), eq(commissionRuns.id, parsed.data.runId), eq(commissionRuns.status, "draft"))),
      db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: "commission_run.adjusted", entityType: "commission_run", entityId: parsed.data.runId, metadata: { employeeId: parsed.data.employeeId, amountCents: parsed.data.amountCents, reason: parsed.data.reason } }),
    ]);
    revalidateCommissions();
    return { status: "success", message: "Ajuste registrado" };
  } catch (error) { console.error("[commissions:adjust] failed", { error: String(error) }); return invalid("No fue posible registrar el ajuste"); }
}

export async function approveCommissionRunAction(_state: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  try {
    const parsed = approveSchema.safeParse({ companyId: formData.get("companyId"), runId: formData.get("runId") });
    if (!parsed.success) return invalid("El cálculo no es válido");
    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canManageCommissions(operator)) return invalid("No tienes permiso para aprobar comisiones");
    const db = getDb();
    const [run] = await db.select({ status: commissionRuns.status }).from(commissionRuns).where(and(eq(commissionRuns.companyId, parsed.data.companyId), eq(commissionRuns.id, parsed.data.runId))).limit(1);
    if (!run) return invalid("El cálculo no existe");
    if (run.status === "approved") return { status: "success", message: "El cálculo ya estaba aprobado" };
    const now = new Date();
    await db.batch([db.update(commissionRuns).set({ status: "approved", approvedByUserId: operator.appUserId, approvedAt: now, updatedAt: now }).where(and(eq(commissionRuns.companyId, parsed.data.companyId), eq(commissionRuns.id, parsed.data.runId), eq(commissionRuns.status, "draft"))), db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: "commission_run.approved", entityType: "commission_run", entityId: parsed.data.runId, metadata: {} })]);
    revalidateCommissions();
    return { status: "success", message: "Cálculo aprobado" };
  } catch (error) { console.error("[commissions:approve] failed", { error: String(error) }); return invalid("No fue posible aprobar el cálculo"); }
}

function invalid(message = "Revisa los datos") { return { status: "error" as const, message }; }
function revalidateCommissions() { revalidatePath("/app/comisiones"); revalidatePath("/app/admin/comisiones"); }
