import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { serviceBranches, services } from "@/db/schema";

export type EffectiveService = {
  id: string;
  code: string | null;
  name: string;
  durationMinutes: number;
  priceCents: number;
  taxBasisPoints: number;
};

export async function getEffectiveServices(
  companyId: string,
  branchId: string,
  serviceIds?: string[],
): Promise<EffectiveService[]> {
  const db = getDb();
  const serviceConditions = [eq(services.companyId, companyId), eq(services.status, "active")];
  if (serviceIds?.length) serviceConditions.push(inArray(services.id, serviceIds));

  const serviceRows = await db
    .select({
      id: services.id,
      code: services.code,
      name: services.name,
      durationMinutes: services.durationMinutes,
      preparationMinutes: services.preparationMinutes,
      cleanupMinutes: services.cleanupMinutes,
      priceCents: services.priceCents,
      taxBasisPoints: services.taxBasisPoints,
    })
    .from(services)
    .where(and(...serviceConditions));

  if (!serviceRows.length) return [];
  const assignments = await db
    .select({
      serviceId: serviceBranches.serviceId,
      branchId: serviceBranches.branchId,
      isAvailable: serviceBranches.isAvailable,
      priceOverrideCents: serviceBranches.priceOverrideCents,
    })
    .from(serviceBranches)
    .where(and(eq(serviceBranches.companyId, companyId), inArray(serviceBranches.serviceId, serviceRows.map((row) => row.id))));

  return serviceRows.flatMap((service) => {
    const rows = assignments.filter((row) => row.serviceId === service.id);
    const assignment = rows.find((row) => row.branchId === branchId);
    // Servicios anteriores a la migración siguen disponibles en todas las sucursales.
    if (rows.length && (!assignment || !assignment.isAvailable)) return [];
    return [{
      id: service.id,
      code: service.code,
      name: service.name,
      durationMinutes: service.durationMinutes + service.preparationMinutes + service.cleanupMinutes,
      priceCents: assignment?.priceOverrideCents ?? service.priceCents,
      taxBasisPoints: service.taxBasisPoints,
    }];
  });
}
