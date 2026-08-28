import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { ServiceForm } from "@/components/service-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db";
import { services } from "@/db/schema";
import { getAuthSession } from "@/lib/auth/server";
import { getTenantContext } from "@/lib/tenant";

export const metadata: Metadata = { title: "Servicios" };

export default async function ServicesPage() {
  const { data: session } = await getAuthSession();
  if (!session?.user) redirect("/login");
  const context = await getTenantContext(session.user.id);
  if (!context) redirect("/app/sin-acceso");

  const rows = await getDb().select().from(services).where(eq(services.companyId, context.companyId)).orderBy(asc(services.name));
  const canCreate = ["owner", "admin", "manager"].includes(context.role);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-7"><p className="text-sm font-medium text-violet-700">Catálogo operativo</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Servicios</h1><p className="mt-2 text-sm text-muted-foreground">Servicios que pueden seleccionarse al registrar una cita.</p></header>
      <div className={canCreate ? "grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]" : undefined}>
        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead>Servicio</TableHead><TableHead>Duración</TableHead><TableHead>Precio</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
          <TableBody>{rows.length ? rows.map((service) => <TableRow key={service.id}><TableCell><p className="font-medium">{service.name}</p><p className="text-xs text-muted-foreground">{service.code}</p></TableCell><TableCell>{service.durationMinutes} min</TableCell><TableCell>{new Intl.NumberFormat("es-MX", { style: "currency", currency: service.currency }).format(service.priceCents / 100)}</TableCell><TableCell><Badge variant="secondary">{service.status === "active" ? "Activo" : "Inactivo"}</Badge></TableCell></TableRow>) : <TableRow><TableCell colSpan={4} className="h-28 text-center text-muted-foreground">Aún no hay servicios.</TableCell></TableRow>}</TableBody>
        </Table></CardContent></Card>
        {canCreate ? <ServiceForm companies={[]} fixedCompanyId={context.companyId} /> : null}
      </div>
    </div>
  );
}
