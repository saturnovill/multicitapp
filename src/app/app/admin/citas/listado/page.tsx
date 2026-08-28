import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin-page-header";
import { AppointmentList, type AppointmentFilters } from "@/components/appointment-list";

export const metadata: Metadata = { title: "Listado de citas | Superadministración" };

export default async function AdminAppointmentListPage({ searchParams }: { searchParams: Promise<AppointmentFilters> }) {
  return <main className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8"><AdminPageHeader eyebrow="Operación global" title="Listado de citas" description="Consulta y filtra las citas de todas las empresas y sucursales." /><AppointmentList filters={await searchParams} calendarBasePath="/app/admin/citas" showCompany /></main>;
}
