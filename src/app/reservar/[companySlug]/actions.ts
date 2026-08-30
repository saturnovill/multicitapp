"use server";

import { randomUUID } from "node:crypto";
import { and, eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import { appointmentServices, appointments, auditLogs, customers } from "@/db/schema";
import { zonedDateTimeToUtc } from "@/lib/date-time";
import { getPublicBookingAvailability, getPublicBookingCatalog } from "@/lib/public-booking";
import type { PublicBookingConfirmation } from "@/types/public-booking";

export type PublicBookingActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  confirmation?: PublicBookingConfirmation;
};

const bookingSchema = z.object({
  companySlug: z.string().trim().min(1).max(100),
  branchId: z.uuid(),
  employeeId: z.uuid(),
  serviceIds: z.array(z.uuid()).min(1).max(20),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  customerName: z.string().trim().min(2).max(160),
  customerPhone: z.string().trim().min(10).max(32),
  customerPhoneConfirm: z.string().trim().min(10).max(32),
  customerEmail: z.union([z.email(), z.literal("")]),
  notes: z.string().trim().max(1000),
  consent: z.literal(true),
  website: z.string().max(0),
});

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export async function createPublicAppointmentAction(_state: PublicBookingActionState, formData: FormData): Promise<PublicBookingActionState> {
  try {
    const parsed = bookingSchema.safeParse({
      companySlug: formData.get("companySlug"),
      branchId: formData.get("branchId"),
      employeeId: formData.get("employeeId"),
      serviceIds: Array.from(new Set(formData.getAll("serviceIds").map(String))),
      date: formData.get("date"),
      time: formData.get("time"),
      customerName: formData.get("customerName"),
      customerPhone: formData.get("customerPhone"),
      customerPhoneConfirm: formData.get("customerPhoneConfirm"),
      customerEmail: formData.get("customerEmail") ?? "",
      notes: formData.get("notes") ?? "",
      consent: formData.get("consent") === "on",
      website: formData.get("website") ?? "",
    });
    if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa los datos de la reservación" };
    const phone = normalizePhone(parsed.data.customerPhone);
    if (phone.length < 10 || phone.length > 15 || phone !== normalizePhone(parsed.data.customerPhoneConfirm)) return { status: "error", message: "Los teléfonos deben coincidir y contener entre 10 y 15 dígitos" };

    const catalog = await getPublicBookingCatalog(parsed.data.companySlug);
    if (!catalog) return { status: "error", message: "La empresa no está disponible" };
    const branch = catalog.branches.find((item) => item.id === parsed.data.branchId);
    const employee = catalog.employees.find((item) => item.id === parsed.data.employeeId && item.branchId === parsed.data.branchId);
    const selectedServices = catalog.services.filter((service) => parsed.data.serviceIds.includes(service.id));
    if (!branch || !employee || selectedServices.length !== parsed.data.serviceIds.length) return { status: "error", message: "La sucursal, el personal o los servicios ya no están disponibles" };

    const availability = await getPublicBookingAvailability({ companySlug: parsed.data.companySlug, branchId: parsed.data.branchId, employeeId: parsed.data.employeeId, serviceIds: parsed.data.serviceIds, date: parsed.data.date });
    if (!availability.slots.some((slot) => slot.time === parsed.data.time && slot.employeeId === parsed.data.employeeId)) return { status: "error", message: availability.error ?? "Ese horario acaba de dejar de estar disponible. Consulta los horarios nuevamente." };

    const startsAt = zonedDateTimeToUtc(parsed.data.date, parsed.data.time, branch.timezone);
    const durationMinutes = selectedServices.reduce((sum, service) => sum + service.durationMinutes, 0);
    const totalCents = selectedServices.reduce((sum, service) => sum + service.priceCents, 0);
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
    const db = getDb();
    const [existingCustomer] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.companyId, catalog.company.id), parsed.data.customerEmail ? or(eq(customers.phone, phone), eq(customers.email, parsed.data.customerEmail)) : eq(customers.phone, phone))).limit(1);
    const customerId = existingCustomer?.id ?? randomUUID();
    const appointmentId = randomUUID();
    const queries = [
      ...(!existingCustomer ? [db.insert(customers).values({ id: customerId, companyId: catalog.company.id, name: parsed.data.customerName, phone, email: parsed.data.customerEmail || null })] : []),
      db.insert(appointments).values({ id: appointmentId, companyId: catalog.company.id, branchId: branch.id, customerId, employeeId: employee.id, startsAt, endsAt, status: "pending", source: "public_booking", notes: parsed.data.notes || null, estimatedTotalCents: totalCents }),
      ...selectedServices.map((service) => db.insert(appointmentServices).values({ companyId: catalog.company.id, appointmentId, serviceId: service.id, serviceName: service.name, durationMinutes: service.durationMinutes, priceCents: service.priceCents })),
      db.insert(auditLogs).values({ companyId: catalog.company.id, actorUserId: null, action: "appointment.public_created", entityType: "appointment", entityId: appointmentId, metadata: { branchId: branch.id, employeeId: employee.id, startsAt: startsAt.toISOString(), source: "public_booking" } }),
    ];
    await db.batch(queries as [typeof queries[number], ...typeof queries]);
    revalidatePath(`/app/citas/${branch.id}`);
    revalidatePath(`/app/admin/citas/${branch.id}`);
    revalidatePath("/app/citas/listado");
    revalidatePath("/app/admin/citas/listado");
    return {
      status: "success",
      message: "Tu cita fue registrada y está pendiente de confirmación.",
      confirmation: {
        reference: appointmentId.slice(0, 8).toUpperCase(),
        branchName: branch.name,
        employeeName: employee.name,
        date: parsed.data.date,
        time: parsed.data.time,
        durationMinutes,
        totalCents,
        currency: catalog.company.currency,
        serviceNames: selectedServices.map((service) => service.name),
      },
    };
  } catch (error) {
    console.error("[public-booking:create] failed", { error: String(error) });
    const overlap = String(error).includes("appointments_employee_time_excl") || String(error).includes("23P01");
    return { status: "error", message: overlap ? "Ese horario acaba de ser reservado. Consulta los horarios nuevamente." : "No fue posible registrar la cita. Inténtalo de nuevo." };
  }
}
