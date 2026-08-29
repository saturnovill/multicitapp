import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { EmployeeDetail } from "@/components/employee-detail";

export const metadata: Metadata = { title: "Empleado | Superadministración" };

export default async function AdminEmployeePage({ params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params;
  if (!z.uuid().safeParse(employeeId).success) notFound();
  return <EmployeeDetail employeeId={employeeId} backHref="/app/admin/empleados" canManage />;
}
