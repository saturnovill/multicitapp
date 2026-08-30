import "server-only";

import { and, eq, inArray, isNull, or } from "drizzle-orm";

import { getDb } from "@/db";
import { branches, companies, employeeServices, scheduleExceptions, weeklySchedules } from "@/db/schema";

export async function checkAppointmentAvailability({ companyId, branchId, employeeId, date, time, startsAt, endsAt, serviceIds }: { companyId: string; branchId: string; employeeId: string; date: string; time: string; startsAt: Date; endsAt: Date; serviceIds: string[] }): Promise<string | null> {
  const db = getDb();
  const [employeeSchedule, branchSchedule, exceptions, assignedServices, branchRows] = await Promise.all([
    db.select({ dayOfWeek: weeklySchedules.dayOfWeek, startMinute: weeklySchedules.startMinute, endMinute: weeklySchedules.endMinute }).from(weeklySchedules).where(and(eq(weeklySchedules.companyId, companyId), eq(weeklySchedules.branchId, branchId), eq(weeklySchedules.employeeId, employeeId), eq(weeklySchedules.scope, "employee"), eq(weeklySchedules.isActive, true))),
    db.select({ dayOfWeek: weeklySchedules.dayOfWeek, startMinute: weeklySchedules.startMinute, endMinute: weeklySchedules.endMinute }).from(weeklySchedules).where(and(eq(weeklySchedules.companyId, companyId), eq(weeklySchedules.branchId, branchId), isNull(weeklySchedules.employeeId), eq(weeklySchedules.scope, "branch"), eq(weeklySchedules.isActive, true))),
    db.select({ id: scheduleExceptions.id, type: scheduleExceptions.type, startsAt: scheduleExceptions.startsAt, endsAt: scheduleExceptions.endsAt }).from(scheduleExceptions).where(and(eq(scheduleExceptions.companyId, companyId), eq(scheduleExceptions.branchId, branchId), inArray(scheduleExceptions.type, ["closed", "absence", "break", "blocked", "special_hours"]), or(isNull(scheduleExceptions.employeeId), eq(scheduleExceptions.employeeId, employeeId)))),
    db.select({ serviceId: employeeServices.serviceId }).from(employeeServices).where(and(eq(employeeServices.companyId, companyId), eq(employeeServices.employeeId, employeeId))),
    db.select({ timezone: branches.timezone, companyTimezone: companies.timezone }).from(branches).innerJoin(companies, eq(companies.id, branches.companyId)).where(and(eq(branches.id, branchId), eq(branches.companyId, companyId))).limit(1),
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
  const timezone = branchRows[0]?.timezone ?? branchRows[0]?.companyTimezone ?? "UTC";
  const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
  const specialHours = exceptions.filter((row) => row.type === "special_hours" && dateFormatter.format(row.startsAt) === date);
  if (specialHours.length && !specialHours.some((row) => startsAt >= row.startsAt && endsAt <= row.endsAt)) return "La cita queda fuera del horario especial de la sucursal";
  const blockers = exceptions.filter((row) => row.type !== "special_hours" && row.startsAt < endsAt && row.endsAt > startsAt);
  if (blockers.length) return "El horario está bloqueado por un descanso, ausencia o cierre";
  return null;
}
