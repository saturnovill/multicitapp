"use server";

import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import {
  appointmentServices,
  appointments,
  auditLogs,
  branches,
  companies,
  customers,
  employeeBranches,
  employees,
  services,
} from "@/db/schema";
import { canManageAppointments, requireCompanyOperator } from "@/lib/company-operator";

export type AppointmentActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const appointmentSchema = z
  .object({
    companyId: z.uuid(),
    branchId: z.uuid(),
    employeeId: z.uuid(),
    customerId: z.union([z.uuid(), z.literal("")]),
    customerName: z.string().trim().max(160),
    customerPhone: z.string().trim().max(32),
    customerEmail: z.union([z.email(), z.literal("")]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    status: z.enum(["pending", "confirmed", "waiting"]),
    notes: z.string().trim().max(2000),
    serviceIds: z.array(z.uuid()).min(1),
  })
  .refine((data) => data.customerId || data.customerName.length >= 2, {
    message: "Selecciona un cliente o captura su nombre",
  });

function zonedDateTimeToUtc(date: string, time: string, timezone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let guess = desired;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = formatter.formatToParts(new Date(guess));
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const observed = Date.UTC(
      Number(value.year),
      Number(value.month) - 1,
      Number(value.day),
      Number(value.hour),
      Number(value.minute),
      Number(value.second),
    );
    guess += desired - observed;
  }
  return new Date(guess);
}

export async function createAppointmentAction(
  _previousState: AppointmentActionState,
  formData: FormData,
): Promise<AppointmentActionState> {
  try {
    const serviceIds = Array.from(new Set(formData.getAll("serviceIds").map(String)));
    const parsed = appointmentSchema.safeParse({
      companyId: formData.get("companyId"),
      branchId: formData.get("branchId"),
      employeeId: formData.get("employeeId"),
      customerId: formData.get("customerId") ?? "",
      customerName: formData.get("customerName") ?? "",
      customerPhone: formData.get("customerPhone") ?? "",
      customerEmail: formData.get("customerEmail") ?? "",
      date: formData.get("date"),
      time: formData.get("time"),
      status: formData.get("status"),
      notes: formData.get("notes") ?? "",
      serviceIds,
    });
    if (!parsed.success) {
      return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa los datos de la cita" };
    }

    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canManageAppointments(operator)) return { status: "error", message: "No tienes permiso para crear citas" };

    const db = getDb();
    const normalizedDate = new Date(`${parsed.data.date}T00:00:00Z`);
    if (Number.isNaN(normalizedDate.getTime()) || normalizedDate.toISOString().slice(0, 10) !== parsed.data.date) {
      return { status: "error", message: "La fecha no es válida" };
    }

    const [branch, employee, serviceRows] = await Promise.all([
      db.select({ id: branches.id, timezone: branches.timezone, companyTimezone: companies.timezone }).from(branches).innerJoin(companies, eq(companies.id, branches.companyId)).where(and(eq(branches.id, parsed.data.branchId), eq(branches.companyId, parsed.data.companyId), eq(branches.status, "active"))).limit(1),
      db.select({ id: employees.id }).from(employees).innerJoin(employeeBranches, and(eq(employeeBranches.employeeId, employees.id), eq(employeeBranches.companyId, parsed.data.companyId))).where(and(eq(employees.id, parsed.data.employeeId), eq(employees.companyId, parsed.data.companyId), eq(employees.status, "active"), eq(employeeBranches.branchId, parsed.data.branchId))).limit(1),
      db.select({ id: services.id, name: services.name, durationMinutes: services.durationMinutes, priceCents: services.priceCents }).from(services).where(and(eq(services.companyId, parsed.data.companyId), eq(services.status, "active"), inArray(services.id, parsed.data.serviceIds))),
    ]);
    if (!branch.length) return { status: "error", message: "La sucursal no está disponible" };
    if (!employee.length) return { status: "error", message: "El empleado no pertenece a esta sucursal" };
    if (serviceRows.length !== parsed.data.serviceIds.length) return { status: "error", message: "Uno o más servicios no están disponibles" };

    let customerId = parsed.data.customerId;
    if (customerId) {
      const [customer] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, customerId), eq(customers.companyId, parsed.data.companyId))).limit(1);
      if (!customer) return { status: "error", message: "El cliente no pertenece a esta empresa" };
    } else {
      customerId = randomUUID();
    }

    const timezone = branch[0].timezone ?? branch[0].companyTimezone;
    const startsAt = zonedDateTimeToUtc(parsed.data.date, parsed.data.time, timezone);
    const durationMinutes = serviceRows.reduce((total, service) => total + service.durationMinutes, 0);
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
    const estimatedTotalCents = serviceRows.reduce((total, service) => total + service.priceCents, 0);
    const appointmentId = randomUUID();

    const queries = [
      ...(!parsed.data.customerId
        ? [db.insert(customers).values({ id: customerId, companyId: parsed.data.companyId, name: parsed.data.customerName, phone: parsed.data.customerPhone || null, email: parsed.data.customerEmail || null })]
        : []),
      db.insert(appointments).values({
        id: appointmentId,
        companyId: parsed.data.companyId,
        branchId: parsed.data.branchId,
        customerId,
        employeeId: parsed.data.employeeId,
        createdByUserId: operator.appUserId,
        startsAt,
        endsAt,
        status: parsed.data.status,
        notes: parsed.data.notes || null,
        estimatedTotalCents,
      }),
      ...serviceRows.map((service) => db.insert(appointmentServices).values({
        companyId: parsed.data.companyId,
        appointmentId,
        serviceId: service.id,
        serviceName: service.name,
        durationMinutes: service.durationMinutes,
        priceCents: service.priceCents,
      })),
      db.insert(auditLogs).values({
        companyId: parsed.data.companyId,
        actorUserId: operator.appUserId,
        action: "appointment.created",
        entityType: "appointment",
        entityId: appointmentId,
        metadata: { branchId: parsed.data.branchId, employeeId: parsed.data.employeeId, startsAt: startsAt.toISOString() },
      }),
    ];
    await db.batch(queries as [typeof queries[number], ...typeof queries]);

    const route = operator.isPlatformAdmin
      ? `/app/admin/citas/${parsed.data.branchId}`
      : `/app/citas/${parsed.data.branchId}`;
    revalidatePath(route);
    return { status: "success", message: "Cita creada correctamente" };
  } catch (error) {
    console.error("[appointments:create] failed", { error: String(error) });
    const overlap = String(error).includes("appointments_employee_time_excl") || String(error).includes("23P01");
    return { status: "error", message: overlap ? "El empleado ya tiene una cita en ese horario" : "No fue posible crear la cita" };
  }
}
