import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SaleForm } from "@/components/sale-form";
import { Badge } from "@/components/ui/badge";
import { getAuthSession } from "@/lib/auth/server";
import { getSaleSetup } from "@/lib/sales-data";
import { getTenantContext } from "@/lib/tenant";

export const metadata: Metadata = { title: "Nueva venta" };

export default async function NewSalePage({ searchParams }: { searchParams: Promise<{ appointmentId?: string }> }) {
  const { data: session } = await getAuthSession();
  if (!session?.user) redirect("/login");
  const context = await getTenantContext(session.user.id);
  if (!context) redirect("/app/sin-acceso");
  const setup = await getSaleSetup(context.companyId);
  if (!setup.company) redirect("/app/ventas");
  const { appointmentId = "" } = await searchParams;
  return <div className="p-4 sm:p-6 lg:p-8"><header className="mb-7"><Badge variant="secondary">Punto de venta</Badge><h1 className="mt-3 text-3xl font-semibold tracking-tight">Nueva venta</h1><p className="mt-2 text-sm text-muted-foreground">Convierte una cita en cobro o crea una venta directa.</p></header>{setup.services.length ? <SaleForm setup={{ ...setup, company: setup.company }} initialAppointmentId={appointmentId} /> : <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground">Primero registra al menos un servicio activo.</div>}</div>;
}
