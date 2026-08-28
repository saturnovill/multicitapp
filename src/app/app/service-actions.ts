"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import { auditLogs, companies, services } from "@/db/schema";
import { canManageCatalogs, requireCompanyOperator } from "@/lib/company-operator";

export type ServiceActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const serviceSchema = z.object({
  companyId: z.uuid(),
  code: z.string().trim().min(1).max(48).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(160),
  durationMinutes: z.coerce.number().int().min(5).max(720),
  price: z.coerce.number().min(0).max(1_000_000),
});

export async function createServiceAction(
  _previousState: ServiceActionState,
  formData: FormData,
): Promise<ServiceActionState> {
  try {
    const parsed = serviceSchema.safeParse({
      companyId: formData.get("companyId"),
      code: formData.get("code"),
      name: formData.get("name"),
      durationMinutes: formData.get("durationMinutes"),
      price: formData.get("price"),
    });
    if (!parsed.success) return { status: "error", message: "Revisa los datos del servicio" };

    const operator = await requireCompanyOperator(parsed.data.companyId);
    if (!canManageCatalogs(operator)) return { status: "error", message: "No tienes permiso para crear servicios" };

    const db = getDb();
    const [company] = await db
      .select({ currency: companies.currency })
      .from(companies)
      .where(eq(companies.id, parsed.data.companyId))
      .limit(1);
    if (!company) return { status: "error", message: "La empresa no existe" };

    const serviceId = randomUUID();
    await db.batch([
      db.insert(services).values({
        id: serviceId,
        companyId: parsed.data.companyId,
        code: parsed.data.code,
        name: parsed.data.name,
        durationMinutes: parsed.data.durationMinutes,
        priceCents: Math.round(parsed.data.price * 100),
        currency: company.currency,
      }),
      db.insert(auditLogs).values({
        companyId: parsed.data.companyId,
        actorUserId: operator.appUserId,
        action: "service.created",
        entityType: "service",
        entityId: serviceId,
        metadata: { code: parsed.data.code, name: parsed.data.name },
      }),
    ]);

    revalidatePath("/app/servicios");
    revalidatePath("/app/admin/servicios");
    revalidatePath("/app/citas", "layout");
    revalidatePath("/app/admin/citas", "layout");
    return { status: "success", message: "Servicio creado" };
  } catch (error) {
    console.error("[services:create] failed", { error: String(error) });
    const duplicate = String(error).includes("services_company_code_uidx");
    return { status: "error", message: duplicate ? "Ese código ya existe en la empresa" : "No fue posible crear el servicio" };
  }
}
