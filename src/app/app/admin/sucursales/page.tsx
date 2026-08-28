import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ArrowUpRight, MapPin } from "lucide-react";

import { AdminPageHeader } from "@/components/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db";
import { branches, companies } from "@/db/schema";

export const metadata: Metadata = { title: "Sucursales | Superadministración" };

export default async function BranchesPage() {
  const rows = await getDb().select({ id: branches.id, name: branches.name, status: branches.status, timezone: branches.timezone, address: branches.address, phone: branches.phone, companyId: companies.id, companyName: companies.name }).from(branches).innerJoin(companies, eq(companies.id, branches.companyId)).orderBy(asc(companies.name), asc(branches.name));

  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
      <AdminPageHeader eyebrow="Operación global" title="Sucursales" description="Vista consolidada de todas las ubicaciones registradas en la plataforma." />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Sucursal</TableHead><TableHead>Empresa</TableHead><TableHead>Ubicación</TableHead><TableHead>Zona horaria</TableHead><TableHead>Estado</TableHead><TableHead className="w-16"><span className="sr-only">Abrir</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.length ? rows.map((branch) => (
                <TableRow key={branch.id}>
                  <TableCell><div className="flex items-center gap-2"><MapPin className="size-4 text-violet-600" /><div><p className="font-medium">{branch.name}</p><p className="text-xs text-muted-foreground">{branch.phone ?? "Sin teléfono"}</p></div></div></TableCell>
                  <TableCell>{branch.companyName}</TableCell>
                  <TableCell className="max-w-64 truncate text-muted-foreground">{branch.address ?? "Sin dirección"}</TableCell>
                  <TableCell>{branch.timezone ?? "Heredada"}</TableCell>
                  <TableCell><Badge variant="secondary">{branch.status === "active" ? "Activa" : "Inactiva"}</Badge></TableCell>
                  <TableCell><Button asChild variant="ghost" size="icon" aria-label={`Abrir empresa ${branch.companyName}`}><Link href={`/app/admin/empresas/${branch.companyId}`}><ArrowUpRight /></Link></Button></TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={6} className="h-28 text-center text-muted-foreground">Aún no hay sucursales.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
