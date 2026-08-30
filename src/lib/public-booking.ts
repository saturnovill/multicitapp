import "server-only";

import { and, asc, eq, gt, inArray, lt, notInArray } from "drizzle-orm";
import { cache } from "react";

import { getDb } from "@/db";
import {
  appointments,
  branches,
  companies,
  employeeBranches,
  employeeServices,
  employees,
  scheduleExceptions,
  serviceCategories,
  services,
  weeklySchedules,
} from "@/db/schema";
import { addCalendarDays, dateInTimezone, isValidCalendarDate, zonedDateTimeToUtc } from "@/lib/date-time";
import type { PublicBookingCatalog, PublicBookingSlot } from "@/types/public-booking";

export const getPublicBookingCatalog = cache(async function getPublicBookingCatalog(companySlug: string): Promise<PublicBookingCatalog | null> {
  const db = getDb();
  const [company] = await db
    .select({ id: companies.id, name: companies.name, slug: companies.slug, timezone: companies.timezone, currency: companies.currency })
    .from(companies)
    .where(and(eq(companies.slug, companySlug), eq(companies.status, "active")))
    .limit(1);
  if (!company) return null;

  const [branchRows, serviceRows, employeeRows] = await Promise.all([
    db.select({ id: branches.id, name: branches.name, address: branches.address, timezone: branches.timezone })
      .from(branches)
      .where(and(eq(branches.companyId, company.id), eq(branches.status, "active")))
      .orderBy(asc(branches.name)),
    db.select({ id: services.id, name: services.name, description: services.description, durationMinutes: services.durationMinutes, priceCents: services.priceCents, currency: services.currency, categoryName: serviceCategories.name })
      .from(services)
      .leftJoin(serviceCategories, and(eq(serviceCategories.id, services.categoryId), eq(serviceCategories.companyId, services.companyId)))
      .where(and(eq(services.companyId, company.id), eq(services.status, "active"), eq(services.isPublic, true)))
      .orderBy(asc(serviceCategories.name), asc(services.name)),
    db.select({ id: employees.id, branchId: employeeBranches.branchId, name: employees.name, color: employees.color })
      .from(employees)
      .innerJoin(employeeBranches, and(eq(employeeBranches.employeeId, employees.id), eq(employeeBranches.companyId, employees.companyId)))
      .innerJoin(branches, and(eq(branches.id, employeeBranches.branchId), eq(branches.companyId, employees.companyId)))
      .where(and(eq(employees.companyId, company.id), eq(employees.status, "active"), eq(branches.status, "active")))
      .orderBy(asc(employees.name)),
  ]);

  const employeeIds = Array.from(new Set(employeeRows.map((employee) => employee.id)));
  const assignmentRows = employeeIds.length
    ? await db.select({ employeeId: employeeServices.employeeId, serviceId: employeeServices.serviceId })
      .from(employeeServices)
      .where(and(eq(employeeServices.companyId, company.id), inArray(employeeServices.employeeId, employeeIds)))
    : [];
  const assignments = new Map<string, string[]>();
  for (const row of assignmentRows) assignments.set(row.employeeId, [...(assignments.get(row.employeeId) ?? []), row.serviceId]);

  return {
    company,
    branches: branchRows.map((branch) => ({ ...branch, timezone: branch.timezone ?? company.timezone })),
    services: serviceRows,
    employees: employeeRows.map((employee) => ({ ...employee, serviceIds: assignments.get(employee.id) ?? [] })),
  };
});

export async function getPublicBookingAvailability({
  companySlug,
  branchId,
  employeeId,
  serviceIds,
  date,
}: {
  companySlug: string;
  branchId: string;
  employeeId: string;
  serviceIds: string[];
  date: string;
}): Promise<{ slots: PublicBookingSlot[]; error?: string }> {
  const catalog = await getPublicBookingCatalog(companySlug);
  if (!catalog) return { slots: [], error: "La empresa no está disponible" };
  const branch = catalog.branches.find((item) => item.id === branchId);
  if (!branch) return { slots: [], error: "La sucursal no está disponible" };
  if (!isValidCalendarDate(date)) return { slots: [], error: "La fecha no es válida" };

  const today = dateInTimezone(new Date(), branch.timezone);
  if (date < today || date > addCalendarDays(today, 31)) return { slots: [], error: "Selecciona una fecha dentro de los próximos 31 días" };
  const requestedServices = Array.from(new Set(serviceIds));
  const selectedServices = catalog.services.filter((service) => requestedServices.includes(service.id));
  if (!requestedServices.length || selectedServices.length !== requestedServices.length) return { slots: [], error: "Selecciona servicios disponibles" };
  const durationMinutes = selectedServices.reduce((sum, service) => sum + service.durationMinutes, 0);
  if (durationMinutes > 480) return { slots: [], error: "La duración total excede el máximo permitido" };

  let eligibleEmployees = catalog.employees.filter((employee) => employee.branchId === branchId && (!employee.serviceIds.length || requestedServices.every((serviceId) => employee.serviceIds.includes(serviceId))));
  if (employeeId !== "any") eligibleEmployees = eligibleEmployees.filter((employee) => employee.id === employeeId);
  if (!eligibleEmployees.length) return { slots: [], error: "No hay personal disponible para esos servicios" };

  const eligibleIds = eligibleEmployees.map((employee) => employee.id);
  const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay();
  const dayStart = zonedDateTimeToUtc(date, "00:00", branch.timezone);
  const dayEnd = zonedDateTimeToUtc(addCalendarDays(date, 1), "00:00", branch.timezone);
  const db = getDb();
  const [employeeScheduleRows, branchScheduleRows, exceptionRows, appointmentRows] = await Promise.all([
    db.select({ employeeId: weeklySchedules.employeeId, startMinute: weeklySchedules.startMinute, endMinute: weeklySchedules.endMinute })
      .from(weeklySchedules)
      .where(and(eq(weeklySchedules.companyId, catalog.company.id), eq(weeklySchedules.branchId, branchId), eq(weeklySchedules.scope, "employee"), eq(weeklySchedules.dayOfWeek, dayOfWeek), eq(weeklySchedules.isActive, true), inArray(weeklySchedules.employeeId, eligibleIds))),
    db.select({ startMinute: weeklySchedules.startMinute, endMinute: weeklySchedules.endMinute })
      .from(weeklySchedules)
      .where(and(eq(weeklySchedules.companyId, catalog.company.id), eq(weeklySchedules.branchId, branchId), eq(weeklySchedules.scope, "branch"), eq(weeklySchedules.dayOfWeek, dayOfWeek), eq(weeklySchedules.isActive, true))),
    db.select({ employeeId: scheduleExceptions.employeeId, type: scheduleExceptions.type, startsAt: scheduleExceptions.startsAt, endsAt: scheduleExceptions.endsAt })
      .from(scheduleExceptions)
      .where(and(eq(scheduleExceptions.companyId, catalog.company.id), eq(scheduleExceptions.branchId, branchId), lt(scheduleExceptions.startsAt, dayEnd), gt(scheduleExceptions.endsAt, dayStart))),
    db.select({ employeeId: appointments.employeeId, startsAt: appointments.startsAt, endsAt: appointments.endsAt })
      .from(appointments)
      .where(and(eq(appointments.companyId, catalog.company.id), eq(appointments.branchId, branchId), inArray(appointments.employeeId, eligibleIds), notInArray(appointments.status, ["cancelled", "no_show"]), lt(appointments.startsAt, dayEnd), gt(appointments.endsAt, dayStart))),
  ]);

  const nowWithLeadTime = Date.now() + 30 * 60_000;
  const slots: PublicBookingSlot[] = [];
  const seen = new Set<string>();
  for (const employee of eligibleEmployees) {
    const ownSchedules = employeeScheduleRows.filter((row) => row.employeeId === employee.id);
    const scheduleRows = ownSchedules.length ? ownSchedules : branchScheduleRows;
    for (const schedule of scheduleRows) {
      for (let minute = schedule.startMinute; minute + durationMinutes <= schedule.endMinute; minute += 15) {
        const time = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
        const startsAt = zonedDateTimeToUtc(date, time, branch.timezone);
        const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);
        if (startsAt.getTime() < nowWithLeadTime) continue;
        const blocked = exceptionRows.some((exception) => exception.type !== "special_hours" && (!exception.employeeId || exception.employeeId === employee.id) && exception.startsAt < endsAt && exception.endsAt > startsAt);
        const occupied = appointmentRows.some((appointment) => appointment.employeeId === employee.id && appointment.startsAt < endsAt && appointment.endsAt > startsAt);
        const key = `${employee.id}:${time}`;
        if (!blocked && !occupied && !seen.has(key)) {
          seen.add(key);
          slots.push({ time, employeeId: employee.id, employeeName: employee.name });
        }
      }
    }
  }
  slots.sort((left, right) => left.time.localeCompare(right.time) || left.employeeName.localeCompare(right.employeeName));
  if (employeeId === "any") {
    const firstByTime = new Map<string, PublicBookingSlot>();
    for (const slot of slots) if (!firstByTime.has(slot.time)) firstByTime.set(slot.time, slot);
    return { slots: Array.from(firstByTime.values()) };
  }
  return { slots };
}
