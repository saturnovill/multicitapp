"use server";

import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import {
  appointments,
  auditLogs,
  branches,
  companies,
  customers,
  employeeBranches,
  employees,
  saleItems,
  salePayments,
  sales,
  services,
} from "@/db/schema";
import { canManageSales, requireCompanyOperator } from "@/lib/company-operator";

export type SaleActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  saleId?: string;
  admin?: boolean;
};

const lineSchema = z.object({
  serviceId: z.uuid(),
  employeeId: z.uuid(),
  quantity: z.number().int().min(1).max(99),
});

const paymentSchema = z.object({
  method: z.enum(["cash", "card", "transfer"]),
  amountCents: z.number().int().positive(),
  reference: z.string().trim().max(160).optional(),
});

const createSchema = z.object({
  companyId: z.uuid(),
  branchId: z.uuid(),
  customerId: z.union([z.uuid(), z.literal("")]),
  appointmentId: z.union([z.uuid(), z.literal("")]),
  discountPercent: z.number().min(0).max(100),
  taxPercent: z.number().min(0).max(100),
  notes: z.string().trim().max(2000),
  items: z.array(lineSchema).min(1).max(100),
  payments: z.array(paymentSchema).min(1).max(3),
});

const cancelSchema = z.object({
  saleId: z.uuid(),
  companyId: z.uuid(),
  reason: z.string().trim().min(3).max(500),
});

function jsonValue(formData: FormData, name: string) {
  try {
    return JSON.parse(String(formData.get(name) ?? "[]"));
  } catch {
    return null;
  }
}

export async function createSaleAction(
  _previousState: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  try {
    const parsed = createSchema.safeParse({
      companyId: formData.get("companyId"),
      branchId: formData.get("branchId"),
      customerId: formData.get("customerId") ?? "",
      appointmentId: formData.get("appointmentId") ?? "",
      discountPercent: Number(formData.get("discountPercent") ?? 0),
      taxPercent: Number(formData.get("taxPercent") ?? 0),
      notes: formData.get("notes") ?? "",
      items: jsonValue(formData, "items"),
      payments: jsonValue(formData, "payments"),
    });
    if (!parsed.success) {
      return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa los datos de la venta" };
    }

    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canManageSales(operator)) return { status: "error", message: "No tienes permiso para registrar ventas" };

    const db = getDb();
    const serviceIds = [...new Set(parsed.data.items.map((item) => item.serviceId))];
    const employeeIds = [...new Set(parsed.data.items.map((item) => item.employeeId))];
    const [companyRows, branchRows, serviceRows, employeeRows, customerRows, appointmentRows] = await Promise.all([
      db.select({ currency: companies.currency }).from(companies).where(eq(companies.id, parsed.data.companyId)).limit(1),
      db.select({ id: branches.id }).from(branches).where(and(eq(branches.companyId, parsed.data.companyId), eq(branches.id, parsed.data.branchId), eq(branches.status, "active"))).limit(1),
      db.select({ id: services.id, code: services.code, name: services.name, priceCents: services.priceCents }).from(services).where(and(eq(services.companyId, parsed.data.companyId), eq(services.status, "active"), inArray(services.id, serviceIds))),
      db.select({ id: employees.id, name: employees.name }).from(employees).innerJoin(employeeBranches, and(eq(employeeBranches.companyId, parsed.data.companyId), eq(employeeBranches.employeeId, employees.id))).where(and(eq(employees.companyId, parsed.data.companyId), eq(employees.status, "active"), eq(employeeBranches.branchId, parsed.data.branchId), inArray(employees.id, employeeIds))),
      parsed.data.customerId ? db.select({ id: customers.id }).from(customers).where(and(eq(customers.companyId, parsed.data.companyId), eq(customers.id, parsed.data.customerId))).limit(1) : Promise.resolve([]),
      parsed.data.appointmentId ? db.select({ id: appointments.id, branchId: appointments.branchId, customerId: appointments.customerId, status: appointments.status }).from(appointments).where(and(eq(appointments.companyId, parsed.data.companyId), eq(appointments.id, parsed.data.appointmentId))).limit(1) : Promise.resolve([]),
    ]);
    if (!companyRows.length || !branchRows.length) return { status: "error", message: "La empresa o sucursal no está disponible" };
    if (serviceRows.length !== serviceIds.length) return { status: "error", message: "Uno o más servicios no están disponibles" };
    if (employeeRows.length !== employeeIds.length) return { status: "error", message: "Uno o más empleados no pertenecen a la sucursal" };
    if (parsed.data.customerId && !customerRows.length) return { status: "error", message: "El cliente no pertenece a esta empresa" };

    const appointment = appointmentRows[0];
    if (parsed.data.appointmentId) {
      if (!appointment) return { status: "error", message: "La cita no existe" };
      if (appointment.branchId !== parsed.data.branchId) return { status: "error", message: "La cita pertenece a otra sucursal" };
      if (["cancelled", "no_show"].includes(appointment.status)) return { status: "error", message: "No se puede cobrar una cita cancelada o marcada como no asistió" };
      if (parsed.data.customerId && appointment.customerId !== parsed.data.customerId) return { status: "error", message: "El cliente no coincide con la cita" };
      const [existingSale] = await db.select({ id: sales.id }).from(sales).where(and(eq(sales.companyId, parsed.data.companyId), eq(sales.appointmentId, appointment.id))).limit(1);
      if (existingSale) return { status: "error", message: "Esta cita ya fue convertida en venta" };
    }

    const servicesById = new Map(serviceRows.map((row) => [row.id, row]));
    const employeesById = new Map(employeeRows.map((row) => [row.id, row]));
    const lines = parsed.data.items.map((item) => {
      const service = servicesById.get(item.serviceId)!;
      const employee = employeesById.get(item.employeeId)!;
      return { ...item, service, employee, lineTotalCents: service.priceCents * item.quantity };
    });
    const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
    const discountCents = Math.round(subtotalCents * parsed.data.discountPercent / 100);
    const taxableCents = subtotalCents - discountCents;
    const taxCents = Math.round(taxableCents * parsed.data.taxPercent / 100);
    const totalCents = taxableCents + taxCents;
    const paidCents = parsed.data.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
    if (paidCents < totalCents) return { status: "error", message: "El pago no cubre el total de la venta" };
    if (paidCents > totalCents && !parsed.data.payments.some((payment) => payment.method === "cash")) {
      return { status: "error", message: "El cambio solo puede calcularse cuando hay pago en efectivo" };
    }

    const saleId = randomUUID();
    const now = new Date();
    const folio = `VEN-${now.toISOString().slice(0, 10).replaceAll("-", "")}-${saleId.slice(0, 8).toUpperCase()}`;
    const customerId = parsed.data.customerId || appointment?.customerId || null;
    const queries = [
      db.insert(sales).values({ id: saleId, companyId: parsed.data.companyId, branchId: parsed.data.branchId, customerId, appointmentId: parsed.data.appointmentId || null, createdByUserId: operator.appUserId, folio, subtotalCents, discountCents, taxCents, totalCents, paidCents, changeCents: paidCents - totalCents, currency: companyRows[0].currency, notes: parsed.data.notes || null }),
      ...lines.map((line) => db.insert(saleItems).values({ companyId: parsed.data.companyId, saleId, serviceId: line.service.id, employeeId: line.employee.id, serviceCode: line.service.code, serviceName: line.service.name, employeeName: line.employee.name, quantity: line.quantity, unitPriceCents: line.service.priceCents, lineTotalCents: line.lineTotalCents })),
      ...parsed.data.payments.map((payment) => db.insert(salePayments).values({ companyId: parsed.data.companyId, saleId, method: payment.method, amountCents: payment.amountCents, reference: payment.reference || null })),
      ...(appointment ? [db.update(appointments).set({ status: "completed", updatedAt: now }).where(and(eq(appointments.companyId, parsed.data.companyId), eq(appointments.id, appointment.id)))] : []),
      db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: "sale.created", entityType: "sale", entityId: saleId, metadata: { folio, branchId: parsed.data.branchId, appointmentId: parsed.data.appointmentId || null, totalCents } }),
    ];
    await db.batch(queries as [typeof queries[number], ...typeof queries]);
    revalidateSales();
    return { status: "success", message: `Venta ${folio} registrada`, saleId, admin: operator.isPlatformAdmin };
  } catch (error) {
    console.error("[sales:create] failed", { error: String(error) });
    const duplicate = String(error).includes("sales_company_appointment_uidx");
    return { status: "error", message: duplicate ? "Esta cita ya fue convertida en venta" : "No fue posible registrar la venta" };
  }
}

export async function cancelSaleAction(
  _previousState: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  try {
    const parsed = cancelSchema.safeParse({ saleId: formData.get("saleId"), companyId: formData.get("companyId"), reason: formData.get("reason") ?? "" });
    if (!parsed.success) return { status: "error", message: "Escribe un motivo de al menos 3 caracteres" };
    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canManageSales(operator)) return { status: "error", message: "No tienes permiso para cancelar ventas" };
    const db = getDb();
    const [sale] = await db.select({ id: sales.id, status: sales.status, folio: sales.folio }).from(sales).where(and(eq(sales.companyId, parsed.data.companyId), eq(sales.id, parsed.data.saleId))).limit(1);
    if (!sale) return { status: "error", message: "La venta no existe" };
    if (sale.status === "cancelled") return { status: "success", message: "La venta ya estaba cancelada" };
    const now = new Date();
    await db.batch([
      db.update(sales).set({ status: "cancelled", cancelledAt: now, cancelledByUserId: operator.appUserId, cancellationReason: parsed.data.reason, updatedAt: now }).where(and(eq(sales.companyId, parsed.data.companyId), eq(sales.id, parsed.data.saleId))),
      db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: "sale.cancelled", entityType: "sale", entityId: parsed.data.saleId, metadata: { folio: sale.folio, reason: parsed.data.reason } }),
    ]);
    revalidateSales();
    return { status: "success", message: `Venta ${sale.folio} cancelada`, saleId: sale.id, admin: operator.isPlatformAdmin };
  } catch (error) {
    console.error("[sales:cancel] failed", { error: String(error) });
    return { status: "error", message: "No fue posible cancelar la venta" };
  }
}

function revalidateSales() {
  revalidatePath("/app/ventas");
  revalidatePath("/app/admin/ventas");
  revalidatePath("/app/reportes");
  revalidatePath("/app/admin/reportes");
}
