"use server";

import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import { auditLogs, branches, companies, employeeBranches, employeeServices, employees, scheduleExceptions, services, weeklySchedules } from "@/db/schema";
import { canManageCatalogs, requireCompanyOperator } from "@/lib/company-operator";

export type EmployeeActionState = { status: "idle" | "success" | "error"; message?: string };

const employeeSchema = z.object({
  employeeId: z.union([z.uuid(), z.literal("")]),
  companyId: z.uuid(),
  name: z.string().trim().min(2).max(160),
  email: z.union([z.email(), z.literal("")]),
  phone: z.string().trim().max(32),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  status: z.enum(["active", "inactive"]),
  branchIds: z.array(z.uuid()).min(1),
  serviceIds: z.array(z.uuid()),
});

const scheduleSchema = z.object({
  companyId: z.uuid(),
  employeeId: z.uuid(),
  branchId: z.uuid(),
  days: z.array(z.object({ dayOfWeek: z.number().int().min(0).max(6), enabled: z.boolean(), startMinute: z.number().int().min(0).max(1439), endMinute: z.number().int().min(1).max(1440) })).length(7),
});

const exceptionSchema = z.object({ companyId: z.uuid(), employeeId: z.uuid(), branchId: z.uuid(), type: z.enum(["absence", "break", "blocked"]), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), reason: z.string().trim().max(500) });
const deleteExceptionSchema = z.object({ companyId: z.uuid(), employeeId: z.uuid(), exceptionId: z.uuid() });

function employeePayload(formData: FormData) {
  return employeeSchema.safeParse({
    employeeId: formData.get("employeeId") ?? "",
    companyId: formData.get("companyId"),
    name: formData.get("name"),
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    color: formData.get("color") ?? "#7c3aed",
    status: formData.get("status") ?? "active",
    branchIds: Array.from(new Set(formData.getAll("branchIds").map(String))),
    serviceIds: Array.from(new Set(formData.getAll("serviceIds").map(String))),
  });
}

async function validateAssignments(companyId: string, branchIds: string[], serviceIds: string[]) {
  const db = getDb();
  const [branchRows, serviceRows] = await Promise.all([
    db.select({ id: branches.id }).from(branches).where(and(eq(branches.companyId, companyId), eq(branches.status, "active"), inArray(branches.id, branchIds))),
    serviceIds.length ? db.select({ id: services.id }).from(services).where(and(eq(services.companyId, companyId), eq(services.status, "active"), inArray(services.id, serviceIds))) : Promise.resolve([]),
  ]);
  return branchRows.length === branchIds.length && serviceRows.length === serviceIds.length;
}

export async function saveEmployeeAction(_state: EmployeeActionState, formData: FormData): Promise<EmployeeActionState> {
  try {
    const parsed = employeePayload(formData);
    if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa los datos del empleado" };
    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canManageCatalogs(operator)) return { status: "error", message: "No tienes permiso para administrar empleados" };
    if (!(await validateAssignments(parsed.data.companyId, parsed.data.branchIds, parsed.data.serviceIds))) return { status: "error", message: "Hay sucursales o servicios que no pertenecen a la empresa" };

    const db = getDb();
    const employeeId = parsed.data.employeeId || randomUUID();
    if (parsed.data.employeeId) {
      const [existing] = await db.select({ id: employees.id }).from(employees).where(and(eq(employees.id, employeeId), eq(employees.companyId, parsed.data.companyId))).limit(1);
      if (!existing) return { status: "error", message: "El empleado no existe" };
    }
    const queries = [
      parsed.data.employeeId
        ? db.update(employees).set({ name: parsed.data.name, email: parsed.data.email || null, phone: parsed.data.phone || null, color: parsed.data.color, status: parsed.data.status, updatedAt: new Date() }).where(and(eq(employees.id, employeeId), eq(employees.companyId, parsed.data.companyId)))
        : db.insert(employees).values({ id: employeeId, companyId: parsed.data.companyId, name: parsed.data.name, email: parsed.data.email || null, phone: parsed.data.phone || null, color: parsed.data.color, status: parsed.data.status }),
      ...(parsed.data.employeeId ? [db.delete(employeeBranches).where(and(eq(employeeBranches.employeeId, employeeId), eq(employeeBranches.companyId, parsed.data.companyId))), db.delete(employeeServices).where(and(eq(employeeServices.employeeId, employeeId), eq(employeeServices.companyId, parsed.data.companyId)))] : []),
      ...parsed.data.branchIds.map((branchId, index) => db.insert(employeeBranches).values({ companyId: parsed.data.companyId, employeeId, branchId, isPrimary: index === 0 })),
      ...parsed.data.serviceIds.map((serviceId) => db.insert(employeeServices).values({ companyId: parsed.data.companyId, employeeId, serviceId })),
      db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: parsed.data.employeeId ? "employee.updated" : "employee.created", entityType: "employee", entityId: employeeId, metadata: { branchIds: parsed.data.branchIds, serviceIds: parsed.data.serviceIds } }),
    ];
    await db.batch(queries as [typeof queries[number], ...typeof queries]);
    revalidateEmployeeRoutes(employeeId);
    return { status: "success", message: parsed.data.employeeId ? "Empleado actualizado" : "Empleado creado" };
  } catch (error) {
    console.error("[employees:save] failed", { error: String(error) });
    return { status: "error", message: "No fue posible guardar el empleado" };
  }
}

export async function saveEmployeeScheduleAction(_state: EmployeeActionState, formData: FormData): Promise<EmployeeActionState> {
  try {
    const days = Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      enabled: formData.get(`enabled-${dayOfWeek}`) === "on",
      startMinute: timeToMinute(String(formData.get(`start-${dayOfWeek}`) ?? "09:00")),
      endMinute: timeToMinute(String(formData.get(`end-${dayOfWeek}`) ?? "18:00")),
    }));
    const parsed = scheduleSchema.safeParse({ companyId: formData.get("companyId"), employeeId: formData.get("employeeId"), branchId: formData.get("branchId"), days });
    if (!parsed.success) return { status: "error", message: "Revisa los horarios capturados" };
    if (parsed.data.days.some((day) => day.enabled && day.startMinute >= day.endMinute)) return { status: "error", message: "La hora de salida debe ser posterior a la entrada" };
    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canManageCatalogs(operator)) return { status: "error", message: "No tienes permiso para administrar horarios" };
    const db = getDb();
    const [assignment] = await db.select({ id: employeeBranches.id }).from(employeeBranches).innerJoin(employees, and(eq(employees.id, employeeBranches.employeeId), eq(employees.companyId, parsed.data.companyId))).where(and(eq(employeeBranches.companyId, parsed.data.companyId), eq(employeeBranches.employeeId, parsed.data.employeeId), eq(employeeBranches.branchId, parsed.data.branchId))).limit(1);
    if (!assignment) return { status: "error", message: "El empleado no pertenece a esa sucursal" };
    const enabledDays = parsed.data.days.filter((day) => day.enabled);
    const queries = [
      db.delete(weeklySchedules).where(and(eq(weeklySchedules.companyId, parsed.data.companyId), eq(weeklySchedules.employeeId, parsed.data.employeeId), eq(weeklySchedules.branchId, parsed.data.branchId), eq(weeklySchedules.scope, "employee"))),
      ...enabledDays.map((day) => db.insert(weeklySchedules).values({ companyId: parsed.data.companyId, branchId: parsed.data.branchId, employeeId: parsed.data.employeeId, scope: "employee", dayOfWeek: day.dayOfWeek, startMinute: day.startMinute, endMinute: day.endMinute })),
      db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: "employee.schedule.updated", entityType: "employee", entityId: parsed.data.employeeId, metadata: { branchId: parsed.data.branchId, activeDays: enabledDays.map((day) => day.dayOfWeek) } }),
    ];
    await db.batch(queries as [typeof queries[number], ...typeof queries]);
    revalidateEmployeeRoutes(parsed.data.employeeId);
    return { status: "success", message: "Horario actualizado" };
  } catch (error) {
    console.error("[employees:schedule] failed", { error: String(error) });
    return { status: "error", message: "No fue posible guardar el horario" };
  }
}

export async function createEmployeeExceptionAction(_state: EmployeeActionState, formData: FormData): Promise<EmployeeActionState> {
  try {
    const parsed = exceptionSchema.safeParse({ companyId: formData.get("companyId"), employeeId: formData.get("employeeId"), branchId: formData.get("branchId"), type: formData.get("type"), date: formData.get("date"), start: formData.get("start"), end: formData.get("end"), reason: formData.get("reason") ?? "" });
    if (!parsed.success) return { status: "error", message: "Revisa los datos del bloqueo" };
    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canManageCatalogs(operator)) return { status: "error", message: "No tienes permiso para administrar bloqueos" };
    const db = getDb();
    const [assignment] = await db.select({ timezone: branches.timezone, companyTimezone: companies.timezone }).from(employeeBranches).innerJoin(branches, and(eq(branches.id, employeeBranches.branchId), eq(branches.companyId, parsed.data.companyId))).innerJoin(companies, eq(companies.id, parsed.data.companyId)).where(and(eq(employeeBranches.companyId, parsed.data.companyId), eq(employeeBranches.employeeId, parsed.data.employeeId), eq(employeeBranches.branchId, parsed.data.branchId))).limit(1);
    if (!assignment) return { status: "error", message: "El empleado no pertenece a esa sucursal" };
    const timezone = assignment.timezone ?? assignment.companyTimezone;
    const startsAt = zonedDateTimeToUtc(parsed.data.date, parsed.data.start, timezone);
    const endsAt = zonedDateTimeToUtc(parsed.data.date, parsed.data.end, timezone);
    if (startsAt >= endsAt) return { status: "error", message: "La hora final debe ser posterior a la inicial" };
    const exceptionId = randomUUID();
    await db.batch([
      db.insert(scheduleExceptions).values({ id: exceptionId, companyId: parsed.data.companyId, branchId: parsed.data.branchId, employeeId: parsed.data.employeeId, type: parsed.data.type, startsAt, endsAt, reason: parsed.data.reason || null }),
      db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: "employee.exception.created", entityType: "schedule_exception", entityId: exceptionId, metadata: { employeeId: parsed.data.employeeId, branchId: parsed.data.branchId, type: parsed.data.type, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() } }),
    ]);
    revalidateEmployeeRoutes(parsed.data.employeeId);
    return { status: "success", message: "Bloqueo agregado al calendario" };
  } catch (error) {
    console.error("[employees:exception] failed", { error: String(error) });
    return { status: "error", message: "No fue posible guardar el bloqueo" };
  }
}

export async function deleteEmployeeExceptionAction(_state: EmployeeActionState, formData: FormData): Promise<EmployeeActionState> {
  try {
    const parsed = deleteExceptionSchema.safeParse({
      companyId: formData.get("companyId"),
      employeeId: formData.get("employeeId"),
      exceptionId: formData.get("exceptionId"),
    });
    if (!parsed.success) return { status: "error", message: "El bloqueo no es válido" };

    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canManageCatalogs(operator)) return { status: "error", message: "No tienes permiso para administrar bloqueos" };

    const db = getDb();
    const [exception] = await db
      .select({
        id: scheduleExceptions.id,
        branchId: scheduleExceptions.branchId,
        type: scheduleExceptions.type,
        startsAt: scheduleExceptions.startsAt,
        endsAt: scheduleExceptions.endsAt,
      })
      .from(scheduleExceptions)
      .where(and(
        eq(scheduleExceptions.id, parsed.data.exceptionId),
        eq(scheduleExceptions.companyId, parsed.data.companyId),
        eq(scheduleExceptions.employeeId, parsed.data.employeeId),
      ))
      .limit(1);
    if (!exception) return { status: "error", message: "El bloqueo ya no existe" };

    await db.batch([
      db.delete(scheduleExceptions).where(and(
        eq(scheduleExceptions.id, parsed.data.exceptionId),
        eq(scheduleExceptions.companyId, parsed.data.companyId),
        eq(scheduleExceptions.employeeId, parsed.data.employeeId),
      )),
      db.insert(auditLogs).values({
        companyId: parsed.data.companyId,
        actorUserId: operator.appUserId,
        action: "employee.exception.deleted",
        entityType: "schedule_exception",
        entityId: exception.id,
        metadata: {
          employeeId: parsed.data.employeeId,
          branchId: exception.branchId,
          type: exception.type,
          startsAt: exception.startsAt.toISOString(),
          endsAt: exception.endsAt.toISOString(),
        },
      }),
    ]);
    revalidateEmployeeRoutes(parsed.data.employeeId);
    return { status: "success", message: "Bloqueo eliminado" };
  } catch (error) {
    console.error("[employees:exception:delete] failed", { error: String(error) });
    return { status: "error", message: "No fue posible eliminar el bloqueo" };
  }
}

function timeToMinute(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return -1;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function zonedDateTimeToUtc(date: string, time: string, timezone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let guess = desired;
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const values = Object.fromEntries(formatter.formatToParts(new Date(guess)).map((part) => [part.type, part.value]));
    guess += desired - Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second));
  }
  return new Date(guess);
}

function revalidateEmployeeRoutes(employeeId: string) {
  revalidatePath("/app/empleados");
  revalidatePath(`/app/empleados/${employeeId}`);
  revalidatePath("/app/admin/empleados");
  revalidatePath(`/app/admin/empleados/${employeeId}`);
  revalidatePath("/app/citas", "layout");
  revalidatePath("/app/admin/citas", "layout");
}
