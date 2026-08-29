import "server-only";

import { and, eq, gt, inArray, isNull, lt, or } from "drizzle-orm";

import { getDb } from "@/db";
import { employeeServices, scheduleExceptions, weeklySchedules } from "@/db/schema";

export async function checkAppointmentAvailability({ companyId, branchId, employeeId, date, time, startsAt, endsAt, serviceIds }: { companyId: string; branchId: string; employeeId: string; date: string; time: string; startsAt: Date; endsAt: Date; serviceIds: string[] }): Promise<string | null> {
  const db = getDb();
  const [employeeSchedule, branchSchedule, exceptions, assignedServices] = await Promise.all([
    db.select({ dayOfWeek: weeklySchedules.dayOfWeek, startMinute: weeklySchedules.startMinute, endMinute: weeklySchedules.endMinute }).from(weeklySchedules).where(and(eq(weeklySchedules.companyId, companyId), eq(weeklySchedules.branchId, branchId), eq(weeklySchedules.employeeId, employeeId), eq(weeklySchedules.scope, "employee"), eq(weeklySchedules.isActive, true))),
    db.select({ dayOfWeek: weeklySchedules.dayOfWeek, startMinute: weeklySchedules.startMinute, endMinute: weeklySchedules.endMinute }).from(weeklySchedules).where(and(eq(weeklySchedules.companyId, companyId), eq(weeklySchedules.branchId, branchId), isNull(weeklySchedules.employeeId), eq(weeklySchedules.scope, "branch"), eq(weeklySchedules.isActive, true))),
    db.select({ id: scheduleExceptions.id }).from(scheduleExceptions).where(and(eq(scheduleExceptions.companyId, companyId), eq(scheduleExceptions.branchId, branchId), inArray(scheduleExceptions.type, ["closed", "absence", "break", "blocked"]), lt(scheduleExceptions.startsAt, endsAt), gt(scheduleExceptions.endsAt, startsAt), or(isNull(scheduleExceptions.employeeId), eq(scheduleExceptions.employeeId, employeeId)))).limit(1),
    db.select({ serviceId: employeeServices.serviceId }).from(employeeServices).where(and(eq(employeeServices.companyId, companyId), eq(employeeServices.employeeId, employeeId))),
  ]);

  if (assignedServices.length) {
    const allowed = new Set(assignedServices.map((row) => row.serviceId));
    if (serviceIds.some((serviceId) => !allowed.has(serviceId))) return "El empleado no tiene asignado uno de los servicios seleccionados";
  }
  const configuredSchedule = employeeSchedule.length ? employeeSchedule : branchSchedule;
  if (configuredSchedule.length) {
    const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay();
    const [hour, minute] = time.split(":").map(Number);
    const startMinute = hour * 60 + minute;
    const durationMinutes = Math.round((endsAt.getTime() - startsAt.getTime()) / 60_000);
    const endMinute = startMinute + durationMinutes;
    const fits = configuredSchedule.some((row) => row.dayOfWeek === dayOfWeek && startMinute >= row.startMinute && endMinute <= row.endMinute);
    if (!fits) return "La cita queda fuera del horario configurado para el empleado";
  }
  if (exceptions.length) return "El horario está bloqueado por un descanso, ausencia o cierre";
  return null;
}
