import type { Metadata } from "next";
import Link from "next/link";
import { count, desc } from "drizzle-orm";
import { ArrowRight, Building2, CalendarDays, MapPin, ShieldCheck, UsersRound } from "lucide-react";

import { AdminPageHeader, AdminStatCard } from "@/components/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db";
import { appointments, appUsers, branches, companies } from "@/db/schema";

export const metadata: Metadata = { title: "Resumen | Superadministración" };

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default async function AdminPage() {
  const db = getDb();
  const [companyTotal, userTotal, branchTotal, appointmentTotal, recentCompanies, recentUsers] = await Promise.all([
    db.select({ value: count() }).from(companies),
    db.select({ value: count() }).from(appUsers),
    db.select({ value: count() }).from(branches),
    db.select({ value: count() }).from(appointments),
    db.select({ id: companies.id, name: companies.name, slug: companies.slug, status: companies.status, createdAt: companies.createdAt }).from(companies).orderBy(desc(companies.createdAt)).limit(5),
    db.select({ id: appUsers.id, name: appUsers.name, email: appUsers.email, platformRole: appUsers.platformRole, active: appUsers.isActive, createdAt: appUsers.createdAt }).from(appUsers).orderBy(desc(appUsers.createdAt)).limit(5),
  ]);

  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
      <AdminPageHeader
        eyebrow="Control de plataforma"
        title="Resumen global"
        description="Consulta la actividad de todas las empresas desde un solo lugar. Los datos de cada organización permanecen separados dentro de la plataforma."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Métricas globales">
        <AdminStatCard label="Empresas" value={companyTotal[0]?.value ?? 0} icon={Building2} />
        <AdminStatCard label="Usuarios" value={userTotal[0]?.value ?? 0} icon={UsersRound} tone="blue" />
        <AdminStatCard label="Sucursales" value={branchTotal[0]?.value ?? 0} icon={MapPin} tone="emerald" />
        <AdminStatCard label="Citas registradas" value={appointmentTotal[0]?.value ?? 0} icon={CalendarDays} tone="amber" />
      </section>

      <section className="mt-7 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between border-b">
            <CardTitle>Empresas recientes</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/app/admin/empresas">Ver todas <ArrowRight /></Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Empresa</TableHead><TableHead>Alta</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader>
              <TableBody>
                {recentCompanies.length ? recentCompanies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell><Link className="font-medium hover:text-violet-700" href={`/app/admin/empresas/${company.id}`}>{company.name}</Link><p className="text-xs text-muted-foreground">{company.slug}</p></TableCell>
                    <TableCell className="text-muted-foreground">{dateFormatter.format(company.createdAt)}</TableCell>
                    <TableCell><Badge variant="secondary">{company.status === "active" ? "Activa" : company.status}</Badge></TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">Aún no hay empresas.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between border-b">
            <CardTitle>Usuarios recientes</CardTitle>
            <Button asChild variant="ghost" size="sm"><Link href="/app/admin/usuarios">Ver todos <ArrowRight /></Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Usuario</TableHead><TableHead>Alta</TableHead><TableHead>Acceso</TableHead></TableRow></TableHeader>
              <TableBody>
                {recentUsers.length ? recentUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell><p className="font-medium">{user.name}</p><p className="text-xs text-muted-foreground">{user.email}</p></TableCell>
                    <TableCell className="text-muted-foreground">{dateFormatter.format(user.createdAt)}</TableCell>
                    <TableCell><Badge variant={user.platformRole === "platform_admin" ? "default" : "secondary"}>{user.platformRole === "platform_admin" ? "Superadmin" : user.active ? "Activo" : "Inactivo"}</Badge></TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">Aún no hay usuarios.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Card className="mt-6 border-violet-100 bg-violet-50/60 ring-violet-100">
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 text-violet-700" aria-hidden="true" />
            <div><p className="font-medium">Registro público desactivado</p><p className="mt-1 text-sm text-muted-foreground">Solo tú puedes crear empresas y credenciales desde esta consola.</p></div>
          </div>
          <Button asChild variant="outline"><Link href="/app/admin/seguridad">Revisar seguridad</Link></Button>
        </CardContent>
      </Card>
    </main>
  );
}
