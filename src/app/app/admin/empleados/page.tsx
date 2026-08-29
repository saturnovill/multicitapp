import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin-page-header";
import { EmployeeDirectory } from "@/components/employee-directory";

export const metadata: Metadata = { title: "Empleados | Superadministración" };

export default function AdminEmployeesPage() {
  return <main className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8"><AdminPageHeader eyebrow="Operación global" title="Empleados" description="Administra los colaboradores y su disponibilidad en todas las empresas." /><EmployeeDirectory detailBasePath="/app/admin/empleados" canManage showCompany /></main>;
}
