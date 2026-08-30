import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin-page-header";
import { SaleForm } from "@/components/sale-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDb } from "@/db";
import { companies } from "@/db/schema";
import { getSaleSetup } from "@/lib/sales-data";

export const metadata: Metadata = { title: "Nueva venta | Superadministración" };

export default async function AdminNewSalePage({ searchParams }: { searchParams: Promise<{ companyId?: string; appointmentId?: string }> }) {
  const query = await searchParams;
  const companyRows = await getDb().select({ id: companies.id, name: companies.name }).from(companies).where(eq(companies.status, "active")).orderBy(asc(companies.name));
  const companyId = companyRows.some((row) => row.id === query.companyId) ? query.companyId! : "";
  const setup = companyId ? await getSaleSetup(companyId) : null;
  return <main className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8"><AdminPageHeader eyebrow="Punto de venta" title="Nueva venta" description="Selecciona primero la empresa que recibirá el cobro." /><Card className="mb-6"><CardContent><form className="flex flex-col gap-3 sm:flex-row"><select name="companyId" defaultValue={companyId} required className="h-9 min-w-72 rounded-lg border border-input bg-white px-3 text-sm"><option value="">Selecciona una empresa</option>{companyRows.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select><Button type="submit">Continuar</Button><Button variant="ghost" asChild><Link href="/app/admin/ventas">Cancelar</Link></Button></form></CardContent></Card>{setup?.company ? setup.services.length ? <SaleForm setup={{ ...setup, company: setup.company }} initialAppointmentId={query.appointmentId} /> : <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground">Esta empresa no tiene servicios activos.</div> : null}</main>;
}
