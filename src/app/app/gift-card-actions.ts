"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import { auditLogs, companies, customers, giftCardMovements, giftCards } from "@/db/schema";
import { canManageGiftCards, requireCompanyOperator } from "@/lib/company-operator";
import type { FinanceActionState } from "@/app/app/cash-actions";

const issueSchema = z.object({ companyId: z.uuid(), customerId: z.union([z.uuid(), z.literal("")]), code: z.string().trim().max(40), balanceCents: z.number().int().positive().max(100_000_000), expiresOn: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]), notes: z.string().trim().max(1000) });
const adjustSchema = z.object({ companyId: z.uuid(), giftCardId: z.uuid(), amountCents: z.number().int().refine((value) => value !== 0), reason: z.string().trim().min(3).max(1000) });
const cancelSchema = z.object({ companyId: z.uuid(), giftCardId: z.uuid(), reason: z.string().trim().min(3).max(1000) });
const cents = (value: FormDataEntryValue | null) => Math.round(Number(value ?? 0) * 100);

export async function issueGiftCardAction(_state: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  try {
    const parsed = issueSchema.safeParse({ companyId: formData.get("companyId"), customerId: formData.get("customerId") ?? "", code: formData.get("code") ?? "", balanceCents: cents(formData.get("balance")), expiresOn: formData.get("expiresOn") ?? "", notes: formData.get("notes") ?? "" });
    if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canManageGiftCards(operator)) return invalid("No tienes permiso para emitir gift cards");
    const db = getDb();
    const [company, customer] = await Promise.all([
      db.select({ currency: companies.currency }).from(companies).where(eq(companies.id, parsed.data.companyId)).limit(1),
      parsed.data.customerId ? db.select({ id: customers.id }).from(customers).where(and(eq(customers.companyId, parsed.data.companyId), eq(customers.id, parsed.data.customerId))).limit(1) : Promise.resolve([]),
    ]);
    if (!company.length) return invalid("La empresa no existe");
    if (parsed.data.customerId && !customer.length) return invalid("El cliente no pertenece a esta empresa");
    const id = randomUUID();
    const code = (parsed.data.code || `GC-${randomBytes(5).toString("hex")}`).toUpperCase();
    await db.batch([
      db.insert(giftCards).values({ id, companyId: parsed.data.companyId, customerId: parsed.data.customerId || null, createdByUserId: operator.appUserId, code, initialBalanceCents: parsed.data.balanceCents, balanceCents: parsed.data.balanceCents, currency: company[0].currency, expiresOn: parsed.data.expiresOn || null, notes: parsed.data.notes || null }),
      db.insert(giftCardMovements).values({ companyId: parsed.data.companyId, giftCardId: id, actorUserId: operator.appUserId, type: "issue", amountCents: parsed.data.balanceCents, balanceAfterCents: parsed.data.balanceCents, notes: "Emisión inicial" }),
      db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: "gift_card.issued", entityType: "gift_card", entityId: id, metadata: { code, balanceCents: parsed.data.balanceCents, expiresOn: parsed.data.expiresOn || null } }),
    ]);
    revalidateGiftCards();
    return { status: "success", message: `Gift card ${code} emitida` };
  } catch (error) { console.error("[gift-card:issue] failed", { error: String(error) }); return invalid(String(error).includes("gift_cards_company_code_uidx") ? "Ese código ya existe" : "No fue posible emitir la gift card"); }
}

export async function adjustGiftCardAction(_state: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  try {
    const parsed = adjustSchema.safeParse({ companyId: formData.get("companyId"), giftCardId: formData.get("giftCardId"), amountCents: cents(formData.get("amount")), reason: formData.get("reason") ?? "" });
    if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canManageGiftCards(operator)) return invalid("No tienes permiso para ajustar gift cards");
    const db = getDb();
    const [card] = await db.select({ balanceCents: giftCards.balanceCents, status: giftCards.status, code: giftCards.code, expiresOn: giftCards.expiresOn }).from(giftCards).where(and(eq(giftCards.companyId, parsed.data.companyId), eq(giftCards.id, parsed.data.giftCardId))).limit(1);
    if (!card || card.status === "cancelled") return invalid("La gift card no está disponible");
    if (card.expiresOn && card.expiresOn < new Date().toISOString().slice(0, 10)) return invalid("La gift card está vencida");
    const balanceAfterCents = card.balanceCents + parsed.data.amountCents;
    if (balanceAfterCents < 0) return invalid("El ajuste supera el saldo disponible");
    await db.batch([
      db.update(giftCards).set({
        balanceCents: sql`${giftCards.balanceCents} + ${parsed.data.amountCents}`,
        status: sql`case when ${giftCards.balanceCents} + ${parsed.data.amountCents} = 0 then 'depleted'::gift_card_status else 'active'::gift_card_status end`,
        updatedAt: new Date(),
      }).where(and(eq(giftCards.companyId, parsed.data.companyId), eq(giftCards.id, parsed.data.giftCardId))),
      db.insert(giftCardMovements).values({
        companyId: parsed.data.companyId,
        giftCardId: parsed.data.giftCardId,
        actorUserId: operator.appUserId,
        type: "adjustment",
        amountCents: parsed.data.amountCents,
        balanceAfterCents: sql`(select balance_cents from gift_cards where company_id = ${parsed.data.companyId}::uuid and id = ${parsed.data.giftCardId}::uuid)`,
        notes: parsed.data.reason,
      }),
      db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: "gift_card.adjusted", entityType: "gift_card", entityId: parsed.data.giftCardId, metadata: { code: card.code, amountCents: parsed.data.amountCents, balanceAfterCents, reason: parsed.data.reason } }),
    ]);
    revalidateGiftCards();
    return { status: "success", message: "Saldo ajustado" };
  } catch (error) { console.error("[gift-card:adjust] failed", { error: String(error) }); return invalid("No fue posible ajustar el saldo"); }
}

export async function cancelGiftCardAction(_state: FinanceActionState, formData: FormData): Promise<FinanceActionState> {
  try {
    const parsed = cancelSchema.safeParse({ companyId: formData.get("companyId"), giftCardId: formData.get("giftCardId"), reason: formData.get("reason") ?? "" });
    if (!parsed.success) return invalid(parsed.error.issues[0]?.message);
    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canManageGiftCards(operator)) return invalid("No tienes permiso para cancelar gift cards");
    const db = getDb();
    const [card] = await db.select({ balanceCents: giftCards.balanceCents, status: giftCards.status, code: giftCards.code }).from(giftCards).where(and(eq(giftCards.companyId, parsed.data.companyId), eq(giftCards.id, parsed.data.giftCardId))).limit(1);
    if (!card) return invalid("La gift card no existe");
    if (card.status === "cancelled") return { status: "success", message: "La gift card ya estaba cancelada" };
    const queries = [
      db.update(giftCards).set({ balanceCents: 0, status: "cancelled", updatedAt: new Date() }).where(and(eq(giftCards.companyId, parsed.data.companyId), eq(giftCards.id, parsed.data.giftCardId))),
      ...(card.balanceCents ? [db.insert(giftCardMovements).values({ companyId: parsed.data.companyId, giftCardId: parsed.data.giftCardId, actorUserId: operator.appUserId, type: "cancel", amountCents: -card.balanceCents, balanceAfterCents: 0, notes: parsed.data.reason })] : []),
      db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: "gift_card.cancelled", entityType: "gift_card", entityId: parsed.data.giftCardId, metadata: { code: card.code, removedBalanceCents: card.balanceCents, reason: parsed.data.reason } }),
    ];
    await db.batch(queries as [typeof queries[number], ...typeof queries]);
    revalidateGiftCards();
    return { status: "success", message: `Gift card ${card.code} cancelada` };
  } catch (error) { console.error("[gift-card:cancel] failed", { error: String(error) }); return invalid("No fue posible cancelar la gift card"); }
}

function invalid(message = "Revisa los datos") { return { status: "error" as const, message }; }
function revalidateGiftCards() { revalidatePath("/app/giftcards"); revalidatePath("/app/admin/giftcards"); revalidatePath("/app/ventas/nueva"); revalidatePath("/app/admin/ventas/nueva"); }
