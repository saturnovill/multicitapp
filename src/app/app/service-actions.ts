"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import { auditLogs, companies, serviceCategories, services } from "@/db/schema";
import { canManageCatalogs, requireCompanyOperator } from "@/lib/company-operator";

export type ServiceActionState = { status: "idle" | "success" | "error"; message?: string };
const serviceSchema = z.object({ serviceId: z.union([z.uuid(), z.literal("")]), companyId: z.uuid(), categoryId: z.union([z.uuid(), z.literal("")]), code: z.string().trim().min(1).max(48).transform((value) => value.toUpperCase()), name: z.string().trim().min(2).max(160), description: z.string().trim().max(2000), durationMinutes: z.coerce.number().int().min(5).max(720), price: z.coerce.number().min(0).max(1_000_000), status: z.enum(["active", "inactive"]), isPublic: z.boolean() });
const categorySchema = z.object({ categoryId: z.union([z.uuid(), z.literal("")]), companyId: z.uuid(), name: z.string().trim().min(2).max(120), status: z.enum(["active", "inactive"]) });

export async function saveServiceAction(_state: ServiceActionState, formData: FormData): Promise<ServiceActionState> {
  try {
    const parsed = serviceSchema.safeParse({ serviceId: formData.get("serviceId") ?? "", companyId: formData.get("companyId"), categoryId: formData.get("categoryId") ?? "", code: formData.get("code"), name: formData.get("name"), description: formData.get("description") ?? "", durationMinutes: formData.get("durationMinutes"), price: formData.get("price"), status: formData.get("status") ?? "active", isPublic: formData.get("isPublic") === "on" });
    if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Revisa los datos del servicio" };
    const operator = await requireCompanyOperator(parsed.data.companyId); if (!canManageCatalogs(operator)) return { status: "error", message: "No tienes permiso para administrar servicios" };
    const db = getDb();
    const [company, category, existing] = await Promise.all([
      db.select({ currency: companies.currency }).from(companies).where(eq(companies.id, parsed.data.companyId)).limit(1),
      parsed.data.categoryId ? db.select({ id: serviceCategories.id }).from(serviceCategories).where(and(eq(serviceCategories.id, parsed.data.categoryId), eq(serviceCategories.companyId, parsed.data.companyId))).limit(1) : Promise.resolve([]),
      parsed.data.serviceId ? db.select({ id: services.id }).from(services).where(and(eq(services.id, parsed.data.serviceId), eq(services.companyId, parsed.data.companyId))).limit(1) : Promise.resolve([]),
    ]);
    if (!company.length) return { status: "error", message: "La empresa no existe" };
    if (parsed.data.categoryId && !category.length) return { status: "error", message: "La categoría no pertenece a la empresa" };
    if (parsed.data.serviceId && !existing.length) return { status: "error", message: "El servicio no existe" };
    const serviceId = parsed.data.serviceId || randomUUID();
    await db.batch([
      parsed.data.serviceId ? db.update(services).set({ categoryId: parsed.data.categoryId || null, code: parsed.data.code, name: parsed.data.name, description: parsed.data.description || null, durationMinutes: parsed.data.durationMinutes, priceCents: Math.round(parsed.data.price * 100), status: parsed.data.status, isPublic: parsed.data.isPublic, updatedAt: new Date() }).where(and(eq(services.id, serviceId), eq(services.companyId, parsed.data.companyId))) : db.insert(services).values({ id: serviceId, companyId: parsed.data.companyId, categoryId: parsed.data.categoryId || null, code: parsed.data.code, name: parsed.data.name, description: parsed.data.description || null, durationMinutes: parsed.data.durationMinutes, priceCents: Math.round(parsed.data.price * 100), currency: company[0].currency, status: parsed.data.status, isPublic: parsed.data.isPublic }),
      db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: parsed.data.serviceId ? "service.updated" : "service.created", entityType: "service", entityId: serviceId, metadata: { code: parsed.data.code, name: parsed.data.name, status: parsed.data.status, isPublic: parsed.data.isPublic } }),
    ]);
    revalidateServiceRoutes(serviceId); return { status: "success", message: parsed.data.serviceId ? "Servicio actualizado" : "Servicio creado" };
  } catch (error) { console.error("[services:save] failed", { error: String(error) }); const duplicate = String(error).includes("services_company_code_uidx"); return { status: "error", message: duplicate ? "Ese código ya existe en la empresa" : "No fue posible guardar el servicio" }; }
}

export async function saveCategoryAction(_state: ServiceActionState, formData: FormData): Promise<ServiceActionState> {
  try {
    const parsed = categorySchema.safeParse({ categoryId: formData.get("categoryId") ?? "", companyId: formData.get("companyId"), name: formData.get("name"), status: formData.get("status") ?? "active" }); if (!parsed.success) return { status: "error", message: "Revisa los datos de la categoría" };
    const operator = await requireCompanyOperator(parsed.data.companyId); if (!canManageCatalogs(operator)) return { status: "error", message: "No tienes permiso para administrar categorías" };
    const id = parsed.data.categoryId || randomUUID(); const categorySlug = `${slug(parsed.data.name)}-${id.slice(0, 6)}`; const db = getDb();
    if (parsed.data.categoryId) { const [existing] = await db.select({ id: serviceCategories.id }).from(serviceCategories).where(and(eq(serviceCategories.id, id), eq(serviceCategories.companyId, parsed.data.companyId))).limit(1); if (!existing) return { status: "error", message: "La categoría no existe" }; }
    await db.batch([parsed.data.categoryId ? db.update(serviceCategories).set({ name: parsed.data.name, slug: categorySlug, status: parsed.data.status, updatedAt: new Date() }).where(and(eq(serviceCategories.id, id), eq(serviceCategories.companyId, parsed.data.companyId))) : db.insert(serviceCategories).values({ id, companyId: parsed.data.companyId, name: parsed.data.name, slug: categorySlug, status: parsed.data.status }), db.insert(auditLogs).values({ companyId: parsed.data.companyId, actorUserId: operator.appUserId, action: parsed.data.categoryId ? "service_category.updated" : "service_category.created", entityType: "service_category", entityId: id, metadata: { name: parsed.data.name, status: parsed.data.status } })]);
    revalidatePath("/app/servicios"); revalidatePath("/app/admin/servicios"); return { status: "success", message: parsed.data.categoryId ? "Categoría actualizada" : "Categoría creada" };
  } catch (error) { console.error("[service-categories:save] failed", { error: String(error) }); return { status: "error", message: "No fue posible guardar la categoría" }; }
}

function slug(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 72) || "categoria"; }
function revalidateServiceRoutes(serviceId: string) { revalidatePath("/app/servicios"); revalidatePath(`/app/servicios/${serviceId}`); revalidatePath("/app/admin/servicios"); revalidatePath(`/app/admin/servicios/${serviceId}`); revalidatePath("/app/citas", "layout"); revalidatePath("/app/admin/citas", "layout"); }
