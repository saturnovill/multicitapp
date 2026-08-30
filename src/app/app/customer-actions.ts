"use server";

import { randomUUID } from "node:crypto";
import { and, eq, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import { auditLogs, customers } from "@/db/schema";
import { canManageAppointments, requireCompanyOperator } from "@/lib/company-operator";

export type CustomerActionState = { status: "idle" | "success" | "error"; message?: string };
const schema = z.object({ customerId: z.union([z.uuid(), z.literal("")]), companyId: z.uuid(), name: z.string().trim().min(2).max(160), phone: z.string().trim().max(32), email: z.union([z.email(), z.literal("")]), notes: z.string().trim().max(2000) });

export async function saveCustomerAction(_state: CustomerActionState, formData: FormData): Promise<CustomerActionState> {
  try {
    const parsed = schema.safeParse({ customerId: formData.get("customerId") ?? "", companyId: formData.get("companyId"), name: formData.get("name"), phone: formData.get("phone") ?? "", email: formData.get("email") ?? "", notes: formData.get("notes") ?? "" });
    if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa los datos del cliente" };
    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canManageAppointments(operator)) return { status: "error", message: "No tienes permiso para administrar clientes" };
    const db = getDb();
    const customerId = parsed.data.customerId || randomUUID();
    const duplicateConditions = [eq(customers.companyId, parsed.data.companyId)];
    const matchingContact = or(
      ...(parsed.data.email ? [eq(customers.email, parsed.data.email)] : []),
      ...(parsed.data.phone ? [eq(customers.phone, parsed.data.phone)] : []),
    );
    if (matchingContact) duplicateConditions.push(matchingContact);
    if (parsed.data.customerId) duplicateConditions.push(ne(customers.id, customerId));
    if (matchingContact) {
      const [duplicate] = await db.select({ id: customers.id, name: customers.name }).from(customers).where(and(...duplicateConditions)).limit(1);
      if (duplicate) return { status: "error", message: `Ya existe un cliente con ese teléfono o correo: ${duplicate.name}` };
    }
    if (parsed.data.customerId) {
      const [existing] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, customerId), eq(customers.companyId, parsed.data.companyId))).limit(1);
      if (!existing) return { status: "error", message: "El cliente no existe" };
    }
    await db.batch([
      parsed.data.customerId ? db.update(customers).set({ name: parsed.data.name, phone: parsed.data.phone || null, email: parsed.data.email || null, notes: parsed.data.notes || null, updatedAt: new Date() }).where(and(eq(customers.id, customerId), eq(customers.companyId, parsed.data.companyId))) : db.insert(customers).values({ id: customerId, companyId: parsed.data.companyId, name: parsed.data.name, phone: parsed.data.phone || null, email: parsed.data.email || null, notes: parsed.data.notes || null }),
      db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: parsed.data.customerId ? "customer.updated" : "customer.created", entityType: "customer", entityId: customerId, metadata: { name: parsed.data.name } }),
    ]);
    revalidatePath("/app/clientes"); revalidatePath(`/app/clientes/${customerId}`); revalidatePath("/app/admin/clientes"); revalidatePath(`/app/admin/clientes/${customerId}`); revalidatePath("/app/citas", "layout"); revalidatePath("/app/admin/citas", "layout");
    return { status: "success", message: parsed.data.customerId ? "Cliente actualizado" : "Cliente creado" };
  } catch (error) {
    console.error("[customers:save] failed", { error: String(error) });
    return { status: "error", message: "No fue posible guardar el cliente" };
  }
}
