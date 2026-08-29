import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EmployeeDirectory } from "@/components/employee-directory";
import { Badge } from "@/components/ui/badge";
import { getAuthSession } from "@/lib/auth/server";
import { getTenantContext } from "@/lib/tenant";

export const metadata: Metadata = { title: "Empleados" };

export default async function EmployeesPage() {
  const { data: session } = await getAuthSession();
  if (!session?.user) redirect("/login");
  const context = await getTenantContext(session.user.id);
  if (!context) redirect("/app/sin-acceso");
  const canManage = ["owner", "admin", "manager"].includes(context.role);
  return <div className="p-4 sm:p-6 lg:p-8"><header className="mb-7"><Badge variant="secondary">Equipo</Badge><h1 className="mt-3 text-3xl font-semibold tracking-tight">Empleados</h1><p className="mt-2 text-sm text-muted-foreground">Administra colaboradores, sucursales, servicios y horarios de {context.companyName}.</p></header><EmployeeDirectory companyId={context.companyId} detailBasePath="/app/empleados" canManage={canManage} showCompany={false} /></div>;
}
