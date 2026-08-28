import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";

import { AdminPageHeader } from "@/components/admin-page-header";
import { ServiceForm } from "@/components/service-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db";
import { companies, services } from "@/db/schema";

export const metadata: Metadata = { title: "Servicios | Superadministración" };

export default async function AdminServicesPage() {
  const db = getDb();
  const [companyRows, serviceRows] = await Promise.all([
    db.select({ id: companies.id, name: companies.name }).from(companies).where(eq(companies.status, "active")).orderBy(asc(companies.name)),
    db.select({ id: services.id, code: services.code, name: services.name, durationMinutes: services.durationMinutes, priceCents: services.priceCents, currency: services.currency, status: services.status, companyName: companies.name }).from(services).innerJoin(companies, eq(companies.id, services.companyId)).orderBy(asc(companies.name), asc(services.name)),
  ]);

  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
      <AdminPageHeader eyebrow="Catálogo global" title="Servicios" description="Administra los servicios disponibles para citas en todas las empresas." />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead>Servicio</TableHead><TableHead>Empresa</TableHead><TableHead>Duración</TableHead><TableHead>Precio</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
          <TableBody>{serviceRows.length ? serviceRows.map((service) => (
            <TableRow key={service.id}><TableCell><p className="font-medium">{service.name}</p><p className="text-xs text-muted-foreground">{service.code}</p></TableCell><TableCell>{service.companyName}</TableCell><TableCell>{service.durationMinutes} min</TableCell><TableCell>{new Intl.NumberFormat("es-MX", { style: "currency", currency: service.currency }).format(service.priceCents / 100)}</TableCell><TableCell><Badge variant="secondary">{service.status === "active" ? "Activo" : "Inactivo"}</Badge></TableCell></TableRow>
          )) : <TableRow><TableCell colSpan={5} className="h-28 text-center text-muted-foreground">Aún no hay servicios.</TableCell></TableRow>}</TableBody>
        </Table></CardContent></Card>
        <ServiceForm companies={companyRows} />
      </div>
    </main>
  );
}
