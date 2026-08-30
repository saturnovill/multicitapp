import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { appUsers, companies, companyMemberships } from "@/db/schema";
import { auth } from "@/lib/auth/server";

export type CompanyOperator = {
  appUserId: string;
  companyId: string;
  isPlatformAdmin: boolean;
  role: "owner" | "admin" | "manager" | "receptionist" | "employee" | null;
};

export async function requireCompanyOperator(companyId: string): Promise<CompanyOperator> {
  const { data: session } = await auth.getSession();
  if (!session?.user) throw new Error("No autenticado");

  const db = getDb();
  const [user] = await db
    .select({ id: appUsers.id, platformRole: appUsers.platformRole, isActive: appUsers.isActive })
    .from(appUsers)
    .where(eq(appUsers.authUserId, session.user.id))
    .limit(1);
  if (!user?.isActive) throw new Error("No autorizado");

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(and(eq(companies.id, companyId), eq(companies.status, "active")))
    .limit(1);
  if (!company) throw new Error("Empresa no disponible");

  if (user.platformRole === "platform_admin") {
    return { appUserId: user.id, companyId, isPlatformAdmin: true, role: null };
  }

  const [membership] = await db
    .select({ role: companyMemberships.role })
    .from(companyMemberships)
    .where(
      and(
        eq(companyMemberships.companyId, companyId),
        eq(companyMemberships.userId, user.id),
        eq(companyMemberships.status, "active"),
      ),
    )
    .limit(1);
  if (!membership) throw new Error("No autorizado");

  return {
    appUserId: user.id,
    companyId,
    isPlatformAdmin: false,
    role: membership.role,
  };
}

export function canManageCatalogs(operator: CompanyOperator) {
  return operator.isPlatformAdmin || ["owner", "admin", "manager"].includes(operator.role ?? "");
}

export function canManageAppointments(operator: CompanyOperator) {
  return operator.isPlatformAdmin || ["owner", "admin", "manager", "receptionist"].includes(operator.role ?? "");
}

export function canManageSales(operator: CompanyOperator) {
  return operator.isPlatformAdmin || ["owner", "admin", "manager", "receptionist"].includes(operator.role ?? "");
}
