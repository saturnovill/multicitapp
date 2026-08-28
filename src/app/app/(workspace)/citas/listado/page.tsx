import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { AppointmentList, type AppointmentFilters } from "@/components/appointment-list";
import { Badge } from "@/components/ui/badge";
import { getDb } from "@/db";
import { employees } from "@/db/schema";
import { getAuthSession } from "@/lib/auth/server";
import { getTenantContext } from "@/lib/tenant";

export const metadata: Metadata = { title: "Listado de citas" };

export default async function AppointmentListPage({ searchParams }: { searchParams: Promise<AppointmentFilters> }) {
  const { data: session } = await getAuthSession();
  if (!session?.user) redirect("/login");
  const context = await getTenantContext(session.user.id);
  if (!context) redirect("/app/sin-acceso");
  const [employee] = context.role === "employee" ? await getDb().select({ id: employees.id }).from(employees).where(and(eq(employees.companyId, context.companyId), eq(employees.userId, context.userId))).limit(1) : [];
  return <div className="p-4 sm:p-6 lg:p-8"><header className="mb-7"><Badge variant="secondary">Citas</Badge><h1 className="mt-3 text-3xl font-semibold tracking-tight">Listado de citas</h1><p className="mt-2 text-sm text-muted-foreground">Consulta las citas de {context.companyName} por fecha, sucursal y estado.</p></header><AppointmentList filters={await searchParams} companyId={context.companyId} employeeId={context.role === "employee" ? employee?.id ?? "00000000-0000-0000-0000-000000000000" : undefined} calendarBasePath="/app/citas" showCompany={false} /></div>;
}
