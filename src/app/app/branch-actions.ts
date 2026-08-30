"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import { auditLogs, branches, companies, scheduleExceptions, weeklySchedules } from "@/db/schema";
import { canManageCatalogs, requireCompanyOperator } from "@/lib/company-operator";

export type BranchActionState = { status: "idle" | "success" | "error"; message?: string };
const branchSchema = z.object({ branchId: z.union([z.uuid(), z.literal("")]), companyId: z.uuid(), name: z.string().trim().min(2).max(160), timezone: z.string().trim().min(3).max(80), address: z.string().trim().max(1000), phone: z.string().trim().max(32), email: z.union([z.email(), z.literal("")]), status: z.enum(["active", "inactive"]) });
const scheduleSchema = z.object({ companyId: z.uuid(), branchId: z.uuid(), days: z.array(z.object({ dayOfWeek: z.number().int().min(0).max(6), enabled: z.boolean(), startMinute: z.number().int().min(0).max(1439), endMinute: z.number().int().min(1).max(1440) })).length(7) });
const exceptionSchema = z.object({ companyId: z.uuid(), branchId: z.uuid(), type: z.enum(["closed", "special_hours"]), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), end: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), reason: z.string().trim().max(500) });
const deleteExceptionSchema = z.object({ companyId: z.uuid(), branchId: z.uuid(), exceptionId: z.uuid() });

export async function saveBranchAction(_state: BranchActionState, formData: FormData): Promise<BranchActionState> {
  try {
    const parsed = branchSchema.safeParse({ branchId: formData.get("branchId") ?? "", companyId: formData.get("companyId"), name: formData.get("name"), timezone: formData.get("timezone"), address: formData.get("address") ?? "", phone: formData.get("phone") ?? "", email: formData.get("email") ?? "", status: formData.get("status") ?? "active" });
    if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa los datos de la sucursal" };
    try { new Intl.DateTimeFormat("es-MX", { timeZone: parsed.data.timezone }).format(); } catch { return { status: "error", message: "La zona horaria no es válida" }; }
    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canManageCatalogs(operator)) return { status: "error", message: "No tienes permiso para administrar sucursales" };
    const db = getDb(); const branchId = parsed.data.branchId || randomUUID();
    if (parsed.data.branchId) { const [existing] = await db.select({ id: branches.id }).from(branches).where(and(eq(branches.id, branchId), eq(branches.companyId, parsed.data.companyId))).limit(1); if (!existing) return { status: "error", message: "La sucursal no existe" }; }
    await db.batch([
      parsed.data.branchId ? db.update(branches).set({ name: parsed.data.name, timezone: parsed.data.timezone, address: parsed.data.address || null, phone: parsed.data.phone || null, email: parsed.data.email || null, status: parsed.data.status, updatedAt: new Date() }).where(and(eq(branches.id, branchId), eq(branches.companyId, parsed.data.companyId))) : db.insert(branches).values({ id: branchId, companyId: parsed.data.companyId, name: parsed.data.name, slug: `${slug(parsed.data.name)}-${branchId.slice(0, 6)}`, timezone: parsed.data.timezone, address: parsed.data.address || null, phone: parsed.data.phone || null, email: parsed.data.email || null, status: parsed.data.status }),
      db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: parsed.data.branchId ? "branch.updated" : "branch.created", entityType: "branch", entityId: branchId, metadata: { name: parsed.data.name, status: parsed.data.status } }),
    ]);
    revalidateBranchRoutes(branchId); return { status: "success", message: parsed.data.branchId ? "Sucursal actualizada" : "Sucursal creada" };
  } catch (error) { console.error("[branches:save] failed", { error: String(error) }); return { status: "error", message: "No fue posible guardar la sucursal" }; }
}

export async function saveBranchScheduleAction(_state: BranchActionState, formData: FormData): Promise<BranchActionState> {
  try {
    const days = Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, enabled: formData.get(`enabled-${dayOfWeek}`) === "on", startMinute: timeToMinute(String(formData.get(`start-${dayOfWeek}`) ?? "09:00")), endMinute: timeToMinute(String(formData.get(`end-${dayOfWeek}`) ?? "18:00")) }));
    const parsed = scheduleSchema.safeParse({ companyId: formData.get("companyId"), branchId: formData.get("branchId"), days });
    if (!parsed.success || parsed.data.days.some((day) => day.enabled && day.startMinute >= day.endMinute)) return { status: "error", message: "Revisa los horarios capturados" };
    const operator = await requireCompanyOperator(parsed.data.companyId); if (!canManageCatalogs(operator)) return { status: "error", message: "No tienes permiso para administrar horarios" };
    const db = getDb(); const [branch] = await db.select({ id: branches.id }).from(branches).where(and(eq(branches.id, parsed.data.branchId), eq(branches.companyId, parsed.data.companyId))).limit(1); if (!branch) return { status: "error", message: "La sucursal no existe" };
    const enabled = parsed.data.days.filter((day) => day.enabled); const queries = [db.delete(weeklySchedules).where(and(eq(weeklySchedules.companyId, parsed.data.companyId), eq(weeklySchedules.branchId, parsed.data.branchId), eq(weeklySchedules.scope, "branch"))), ...enabled.map((day) => db.insert(weeklySchedules).values({ companyId: parsed.data.companyId, branchId: parsed.data.branchId, employeeId: null, scope: "branch", dayOfWeek: day.dayOfWeek, startMinute: day.startMinute, endMinute: day.endMinute })), db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: "branch.schedule.updated", entityType: "branch", entityId: parsed.data.branchId, metadata: { activeDays: enabled.map((day) => day.dayOfWeek) } })];
    await db.batch(queries as [typeof queries[number], ...typeof queries]); revalidateBranchRoutes(parsed.data.branchId); return { status: "success", message: "Horario general actualizado" };
  } catch (error) { console.error("[branches:schedule] failed", { error: String(error) }); return { status: "error", message: "No fue posible guardar el horario" }; }
}

export async function createBranchExceptionAction(_state: BranchActionState, formData: FormData): Promise<BranchActionState> {
  try {
    const parsed = exceptionSchema.safeParse({ companyId: formData.get("companyId"), branchId: formData.get("branchId"), type: formData.get("type"), date: formData.get("date"), start: formData.get("start"), end: formData.get("end"), reason: formData.get("reason") ?? "" });
    if (!parsed.success) return { status: "error", message: "Revisa la fecha y el horario especial" };
    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canManageCatalogs(operator)) return { status: "error", message: "No tienes permiso para administrar horarios" };
    const db = getDb();
    const [branch] = await db.select({ timezone: branches.timezone, companyTimezone: companies.timezone }).from(branches).innerJoin(companies, eq(companies.id, branches.companyId)).where(and(eq(branches.id, parsed.data.branchId), eq(branches.companyId, parsed.data.companyId))).limit(1);
    if (!branch) return { status: "error", message: "La sucursal no existe" };
    const timezone = branch.timezone ?? branch.companyTimezone;
    const startsAt = zonedDateTimeToUtc(parsed.data.date, parsed.data.type === "closed" ? "00:00" : parsed.data.start, timezone);
    const endsAt = parsed.data.type === "closed"
      ? zonedDateTimeToUtc(nextDate(parsed.data.date), "00:00", timezone)
      : zonedDateTimeToUtc(parsed.data.date, parsed.data.end, timezone);
    if (startsAt >= endsAt) return { status: "error", message: "La hora final debe ser posterior a la inicial" };
    const exceptionId = randomUUID();
    await db.batch([
      db.insert(scheduleExceptions).values({ id: exceptionId, companyId: parsed.data.companyId, branchId: parsed.data.branchId, employeeId: null, type: parsed.data.type, startsAt, endsAt, reason: parsed.data.reason || null }),
      db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: "branch.exception.created", entityType: "schedule_exception", entityId: exceptionId, metadata: { branchId: parsed.data.branchId, type: parsed.data.type, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() } }),
    ]);
    revalidateBranchRoutes(parsed.data.branchId);
    return { status: "success", message: parsed.data.type === "closed" ? "Cierre registrado" : "Horario especial registrado" };
  } catch (error) { console.error("[branches:exception] failed", { error: String(error) }); return { status: "error", message: "No fue posible guardar la excepción" }; }
}

export async function deleteBranchExceptionAction(_state: BranchActionState, formData: FormData): Promise<BranchActionState> {
  try {
    const parsed = deleteExceptionSchema.safeParse({ companyId: formData.get("companyId"), branchId: formData.get("branchId"), exceptionId: formData.get("exceptionId") });
    if (!parsed.success) return { status: "error", message: "La excepción no es válida" };
    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canManageCatalogs(operator)) return { status: "error", message: "No tienes permiso para administrar horarios" };
    const db = getDb();
    const [exception] = await db.select({ id: scheduleExceptions.id, type: scheduleExceptions.type }).from(scheduleExceptions).where(and(eq(scheduleExceptions.id, parsed.data.exceptionId), eq(scheduleExceptions.companyId, parsed.data.companyId), eq(scheduleExceptions.branchId, parsed.data.branchId), isNull(scheduleExceptions.employeeId))).limit(1);
    if (!exception) return { status: "error", message: "La excepción ya no existe" };
    await db.batch([
      db.delete(scheduleExceptions).where(and(eq(scheduleExceptions.id, exception.id), eq(scheduleExceptions.companyId, parsed.data.companyId))),
      db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: "branch.exception.deleted", entityType: "schedule_exception", entityId: exception.id, metadata: { branchId: parsed.data.branchId, type: exception.type } }),
    ]);
    revalidateBranchRoutes(parsed.data.branchId);
    return { status: "success", message: "Excepción eliminada" };
  } catch (error) { console.error("[branches:exception:delete] failed", { error: String(error) }); return { status: "error", message: "No fue posible eliminar la excepción" }; }
}

function timeToMinute(value: string) { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return -1; const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; }
function nextDate(date: string) { const value = new Date(`${date}T12:00:00Z`); value.setUTCDate(value.getUTCDate() + 1); return value.toISOString().slice(0, 10); }
function zonedDateTimeToUtc(date: string, time: string, timezone: string) { const [year, month, day] = date.split("-").map(Number); const [hour, minute] = time.split(":").map(Number); const desired = Date.UTC(year, month - 1, day, hour, minute); let guess = desired; const formatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }); for (let attempt = 0; attempt < 2; attempt += 1) { const parts = formatter.formatToParts(new Date(guess)); const value = Object.fromEntries(parts.map((part) => [part.type, part.value])); const observed = Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day), Number(value.hour), Number(value.minute), Number(value.second)); guess += desired - observed; } return new Date(guess); }
function slug(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 72) || "sucursal"; }
function revalidateBranchRoutes(branchId: string) { revalidatePath("/app/sucursales"); revalidatePath(`/app/sucursales/${branchId}`); revalidatePath("/app/admin/sucursales"); revalidatePath(`/app/admin/sucursales/${branchId}`); revalidatePath("/app/citas", "layout"); revalidatePath("/app/admin/citas", "layout"); }
