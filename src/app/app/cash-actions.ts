"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import { auditLogs, branches, cashMovements, cashRegisterSessions } from "@/db/schema";
import { canOperateCash, requireCompanyOperator } from "@/lib/company-operator";

export type FinanceActionState = { status: "idle" | "success" | "error"; message?: string };

const openSchema = z.object({ companyId: z.uuid(), branchId: z.uuid(), openingBalanceCents: z.number().int().min(0).max(100_000_000), notes: z.string().trim().max(1000) });
const movementSchema = z.object({ companyId: z.uuid(), sessionId: z.uuid(), type: z.enum(["income", "withdrawal", "adjustment"]), method: z.enum(["cash", "card", "transfer"]), amountCents: z.number().int().positive().max(100_000_000), category: z.string().trim().min(2).max(100), reason: z.string().trim().min(3).max(1000) });
const closeSchema = z.object({ companyId: z.uuid(), sessionId: z.uuid(), countedCashCents: z.number().int().min(0).max(100_000_000), notes: z.string().trim().max(1000) });
const cents = (value: FormDataEntryValue | null) => Math.round(Number(value ?? 0) * 100);

export async function openCashSessionAction(_state: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  try {
    const parsed = openSchema.safeParse({ companyId: formData.get("companyId"), branchId: formData.get("branchId"), openingBalanceCents: cents(formData.get("openingBalance")), notes: formData.get("notes") ?? "" });
    if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canOperateCash(operator)) return invalid("No tienes permiso para abrir caja");
    const db = getDb();
    const [branch] = await db.select({ id: branches.id }).from(branches).where(and(eq(branches.companyId, parsed.data.companyId), eq(branches.id, parsed.data.branchId), eq(branches.status, "active"))).limit(1);
    if (!branch) return invalid("La sucursal no está disponible");
    const [existing] = await db.select({ id: cashRegisterSessions.id }).from(cashRegisterSessions).where(and(eq(cashRegisterSessions.companyId, parsed.data.companyId), eq(cashRegisterSessions.branchId, parsed.data.branchId), eq(cashRegisterSessions.status, "open"))).limit(1);
    if (existing) return invalid("Esta sucursal ya tiene una caja abierta");
    const sessionId = randomUUID();
    await db.batch([
      db.insert(cashRegisterSessions).values({ id: sessionId, companyId: parsed.data.companyId, branchId: parsed.data.branchId, openedByUserId: operator.appUserId, openingBalanceCents: parsed.data.openingBalanceCents, openingNotes: parsed.data.notes || null }),
      db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: "cash_session.opened", entityType: "cash_register_session", entityId: sessionId, metadata: { branchId: parsed.data.branchId, openingBalanceCents: parsed.data.openingBalanceCents } }),
    ]);
    revalidateFinance();
    return { status: "success", message: "Caja abierta correctamente" };
  } catch (error) {
    console.error("[cash:open] failed", { error: String(error) });
    return invalid(String(error).includes("cash_register_sessions_one_open_uidx") ? "Esta sucursal ya tiene una caja abierta" : "No fue posible abrir la caja");
  }
}

export async function addCashMovementAction(_state: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  try {
    const parsed = movementSchema.safeParse({ companyId: formData.get("companyId"), sessionId: formData.get("sessionId"), type: formData.get("type"), method: formData.get("method"), amountCents: cents(formData.get("amount")), category: formData.get("category") ?? "", reason: formData.get("reason") ?? "" });
    if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canOperateCash(operator)) return invalid("No tienes permiso para registrar movimientos");
    const db = getDb();
    const [session] = await db.select({ id: cashRegisterSessions.id }).from(cashRegisterSessions).where(and(eq(cashRegisterSessions.companyId, parsed.data.companyId), eq(cashRegisterSessions.id, parsed.data.sessionId), eq(cashRegisterSessions.status, "open"))).limit(1);
    if (!session) return invalid("La caja ya no está abierta");
    const [movement] = await db.insert(cashMovements).values({ companyId: parsed.data.companyId, sessionId: parsed.data.sessionId, actorUserId: operator.appUserId, type: parsed.data.type, method: parsed.data.method, amountCents: parsed.data.amountCents, category: parsed.data.category, reason: parsed.data.reason }).returning({ id: cashMovements.id });
    await db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: "cash_movement.created", entityType: "cash_movement", entityId: movement.id, metadata: { sessionId: parsed.data.sessionId, type: parsed.data.type, method: parsed.data.method, amountCents: parsed.data.amountCents } });
    revalidateFinance();
    return { status: "success", message: "Movimiento registrado" };
  } catch (error) { console.error("[cash:movement] failed", { error: String(error) }); return invalid("No fue posible registrar el movimiento"); }
}

export async function closeCashSessionAction(_state: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  try {
    const parsed = closeSchema.safeParse({ companyId: formData.get("companyId"), sessionId: formData.get("sessionId"), countedCashCents: cents(formData.get("countedCash")), notes: formData.get("notes") ?? "" });
    if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canOperateCash(operator)) return invalid("No tienes permiso para cerrar caja");
    const db = getDb();
    const [session] = await db.select({ id: cashRegisterSessions.id, openingBalanceCents: cashRegisterSessions.openingBalanceCents }).from(cashRegisterSessions).where(and(eq(cashRegisterSessions.companyId, parsed.data.companyId), eq(cashRegisterSessions.id, parsed.data.sessionId), eq(cashRegisterSessions.status, "open"))).limit(1);
    if (!session) return invalid("La caja ya no está abierta");
    const movements = await db.select({ type: cashMovements.type, method: cashMovements.method, amountCents: cashMovements.amountCents }).from(cashMovements).where(and(eq(cashMovements.companyId, parsed.data.companyId), eq(cashMovements.sessionId, parsed.data.sessionId)));
    const expectedCashCents = movements.filter((row) => row.method === "cash").reduce((total, row) => total + (["withdrawal", "refund"].includes(row.type) ? -row.amountCents : row.amountCents), session.openingBalanceCents);
    const differenceCents = parsed.data.countedCashCents - expectedCashCents;
    const now = new Date();
    await db.batch([
      db.update(cashRegisterSessions).set({ status: "closed", expectedCashCents, countedCashCents: parsed.data.countedCashCents, differenceCents, closingNotes: parsed.data.notes || null, closedByUserId: operator.appUserId, closedAt: now, updatedAt: now }).where(and(eq(cashRegisterSessions.companyId, parsed.data.companyId), eq(cashRegisterSessions.id, parsed.data.sessionId), eq(cashRegisterSessions.status, "open"))),
      db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: "cash_session.closed", entityType: "cash_register_session", entityId: parsed.data.sessionId, metadata: { expectedCashCents, countedCashCents: parsed.data.countedCashCents, differenceCents } }),
    ]);
    revalidateFinance();
    return { status: "success", message: `Caja cerrada. Diferencia: ${(differenceCents / 100).toFixed(2)}` };
  } catch (error) { console.error("[cash:close] failed", { error: String(error) }); return invalid("No fue posible cerrar la caja"); }
}

function invalid(message = "Revisa los datos") { return { status: "error" as const, message }; }
function revalidateFinance() { revalidatePath("/app/caja"); revalidatePath("/app/admin/caja"); revalidatePath("/app/ventas/nueva"); revalidatePath("/app/admin/ventas/nueva"); }
