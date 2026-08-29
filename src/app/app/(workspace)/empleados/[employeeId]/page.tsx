import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { EmployeeDetail } from "@/components/employee-detail";
import { getAuthSession } from "@/lib/auth/server";
import { getTenantContext } from "@/lib/tenant";

export const metadata: Metadata = { title: "Empleado" };

export default async function EmployeePage({ params }: { params: Promise<{ employeeId: string }> }) {
  const [{ employeeId }, sessionResult] = await Promise.all([params, getAuthSession()]);
  if (!sessionResult.data?.user) redirect("/login");
  if (!z.uuid().safeParse(employeeId).success) notFound();
  const context = await getTenantContext(sessionResult.data.user.id);
  if (!context) redirect("/app/sin-acceso");
  return <EmployeeDetail employeeId={employeeId} companyId={context.companyId} backHref="/app/empleados" canManage={["owner", "admin", "manager"].includes(context.role)} />;
}
