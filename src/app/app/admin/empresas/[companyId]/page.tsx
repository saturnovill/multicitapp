import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, count, desc, eq, gte } from "drizzle-orm";
import { ArrowLeft, BriefcaseBusiness, CalendarDays, ContactRound, MapPin, Settings, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AdminPageHeader, AdminStatCard } from "@/components/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db";
import { appointments, appUsers, auditLogs, branches, companies, companyMemberships, customers, employees, services } from "@/db/schema";

type PageProps = { params: Promise<{ companyId: string }> };

const roleLabels: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  manager: "Gerente",
  receptionist: "Recepción",
  employee: "Empleado",
};

const appointmentLabels: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  waiting: "En espera",
  in_service: "En servicio",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { companyId } = await params;
  if (!z.uuid().safeParse(companyId).success) return { title: "Empresa | Superadministración" };
  const [company] = await getDb().select({ name: companies.name }).from(companies).where(eq(companies.id, companyId)).limit(1);
  return { title: company ? `${company.name} | Superadministración` : "Empresa | Superadministración" };
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const { companyId } = await params;
  if (!z.uuid().safeParse(companyId).success) notFound();

  const db = getDb();
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
  if (!company) notFound();

  const [branchRows, memberRows, employeeRows, serviceRows, customerTotal, appointmentTotal, upcomingAppointments, auditRows] = await Promise.all([
    db.select().from(branches).where(eq(branches.companyId, companyId)).orderBy(asc(branches.name)),
    db.select({ id: companyMemberships.id, name: appUsers.name, email: appUsers.email, role: companyMemberships.role, status: companyMemberships.status }).from(companyMemberships).innerJoin(appUsers, eq(appUsers.id, companyMemberships.userId)).where(eq(companyMemberships.companyId, companyId)).orderBy(asc(appUsers.name)),
    db.select({ id: employees.id, name: employees.name, email: employees.email, phone: employees.phone, color: employees.color, status: employees.status }).from(employees).where(eq(employees.companyId, companyId)).orderBy(asc(employees.name)),
    db.select({ id: services.id, name: services.name, code: services.code, durationMinutes: services.durationMinutes, priceCents: services.priceCents, currency: services.currency, status: services.status, isPublic: services.isPublic }).from(services).where(eq(services.companyId, companyId)).orderBy(asc(services.name)),
    db.select({ value: count() }).from(customers).where(eq(customers.companyId, companyId)),
    db.select({ value: count() }).from(appointments).where(eq(appointments.companyId, companyId)),
    db.select({ id: appointments.id, startsAt: appointments.startsAt, status: appointments.status, customerName: customers.name, employeeName: employees.name, branchName: branches.name }).from(appointments).innerJoin(customers, and(eq(customers.id, appointments.customerId), eq(customers.companyId, appointments.companyId))).innerJoin(employees, and(eq(employees.id, appointments.employeeId), eq(employees.companyId, appointments.companyId))).innerJoin(branches, and(eq(branches.id, appointments.branchId), eq(branches.companyId, appointments.companyId))).where(and(eq(appointments.companyId, companyId), gte(appointments.startsAt, new Date()))).orderBy(asc(appointments.startsAt)).limit(8),
    db.select({ id: auditLogs.id, action: auditLogs.action, occurredAt: auditLogs.occurredAt, actorName: appUsers.name }).from(auditLogs).leftJoin(appUsers, eq(appUsers.id, auditLogs.actorUserId)).where(eq(auditLogs.companyId, companyId)).orderBy(desc(auditLogs.occurredAt)).limit(8),
  ]);

  const dateTimeFormatter = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: company.timezone });
  const moneyFormatter = new Intl.NumberFormat("es-MX", { style: "currency", currency: company.currency });

  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
      <AdminPageHeader
        eyebrow="Detalle de empresa"
        title={company.name}
        description={`${company.slug} · ${company.timezone} · ${company.currency}`}
        action={<div className="flex flex-wrap gap-2"><Button asChild><Link href={`/app/admin/empresas/${companyId}/configuracion`}><Settings /> Configurar</Link></Button><Button asChild variant="outline"><Link href="/app/admin/empresas"><ArrowLeft /> Volver a empresas</Link></Button></div>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Métricas de la empresa">
        <AdminStatCard label="Sucursales" value={branchRows.length} icon={MapPin} />
        <AdminStatCard label="Usuarios" value={memberRows.length} icon={UsersRound} tone="blue" />
        <AdminStatCard label="Empleados" value={employeeRows.length} icon={BriefcaseBusiness} tone="emerald" />
        <AdminStatCard label="Clientes" value={customerTotal[0]?.value ?? 0} icon={ContactRound} tone="amber" />
        <AdminStatCard label="Citas" value={appointmentTotal[0]?.value ?? 0} icon={CalendarDays} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <DataCard title="Sucursales">
          <Table><TableHeader><TableRow><TableHead>Sucursal</TableHead><TableHead>Contacto</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>
            {branchRows.length ? branchRows.map((branch) => <TableRow key={branch.id}><TableCell><p className="font-medium">{branch.name}</p><p className="text-xs text-muted-foreground">{branch.address ?? "Sin dirección"}</p></TableCell><TableCell><p>{branch.phone ?? "—"}</p><p className="text-xs text-muted-foreground">{branch.email ?? "Sin correo"}</p></TableCell><TableCell><Badge variant="secondary">{branch.status === "active" ? "Activa" : "Inactiva"}</Badge></TableCell></TableRow>) : <EmptyRow columns={3} label="No hay sucursales." />}
          </TableBody></Table>
        </DataCard>

        <DataCard title="Usuarios y permisos">
          <Table><TableHeader><TableRow><TableHead>Usuario</TableHead><TableHead>Rol</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>
            {memberRows.length ? memberRows.map((member) => <TableRow key={member.id}><TableCell><p className="font-medium">{member.name}</p><p className="text-xs text-muted-foreground">{member.email}</p></TableCell><TableCell><Badge variant="secondary">{roleLabels[member.role]}</Badge></TableCell><TableCell><Badge variant="outline">{member.status === "active" ? "Activo" : member.status}</Badge></TableCell></TableRow>) : <EmptyRow columns={3} label="No hay usuarios asignados." />}
          </TableBody></Table>
        </DataCard>

        <DataCard title="Empleados">
          <Table><TableHeader><TableRow><TableHead>Empleado</TableHead><TableHead>Contacto</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>
            {employeeRows.length ? employeeRows.map((employee) => <TableRow key={employee.id}><TableCell><div className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: employee.color }} /><span className="font-medium">{employee.name}</span></div></TableCell><TableCell><p>{employee.phone ?? "—"}</p><p className="text-xs text-muted-foreground">{employee.email ?? "Sin correo"}</p></TableCell><TableCell><Badge variant="secondary">{employee.status === "active" ? "Activo" : "Inactivo"}</Badge></TableCell></TableRow>) : <EmptyRow columns={3} label="No hay empleados." />}
          </TableBody></Table>
        </DataCard>

        <DataCard title="Servicios">
          <Table><TableHeader><TableRow><TableHead>Servicio</TableHead><TableHead>Duración</TableHead><TableHead>Precio</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>
            {serviceRows.length ? serviceRows.map((service) => <TableRow key={service.id}><TableCell><p className="font-medium">{service.name}</p><p className="text-xs text-muted-foreground">{service.code} · {service.isPublic ? "Público" : "Interno"}</p></TableCell><TableCell>{service.durationMinutes} min</TableCell><TableCell>{moneyFormatter.format(service.priceCents / 100)}</TableCell><TableCell><Badge variant="secondary">{service.status === "active" ? "Activo" : "Inactivo"}</Badge></TableCell></TableRow>) : <EmptyRow columns={4} label="No hay servicios." />}
          </TableBody></Table>
        </DataCard>

        <DataCard title="Próximas citas">
          <Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead><TableHead>Empleado</TableHead><TableHead>Estado</TableHead></TableRow></TableHeader><TableBody>
            {upcomingAppointments.length ? upcomingAppointments.map((appointment) => <TableRow key={appointment.id}><TableCell><p className="whitespace-nowrap">{dateTimeFormatter.format(appointment.startsAt)}</p><p className="text-xs text-muted-foreground">{appointment.branchName}</p></TableCell><TableCell>{appointment.customerName}</TableCell><TableCell>{appointment.employeeName}</TableCell><TableCell><Badge variant="secondary">{appointmentLabels[appointment.status]}</Badge></TableCell></TableRow>) : <EmptyRow columns={4} label="No hay citas próximas." />}
          </TableBody></Table>
        </DataCard>

        <DataCard title="Actividad reciente">
          <Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Acción</TableHead><TableHead>Responsable</TableHead></TableRow></TableHeader><TableBody>
            {auditRows.length ? auditRows.map((audit) => <TableRow key={audit.id}><TableCell className="whitespace-nowrap text-muted-foreground">{dateTimeFormatter.format(audit.occurredAt)}</TableCell><TableCell><Badge variant="secondary">{audit.action}</Badge></TableCell><TableCell>{audit.actorName ?? "Sistema"}</TableCell></TableRow>) : <EmptyRow columns={3} label="No hay actividad registrada." />}
          </TableBody></Table>
        </DataCard>
      </section>
    </main>
  );
}

function DataCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card><CardHeader className="border-b"><CardTitle>{title}</CardTitle></CardHeader><CardContent className="p-0">{children}</CardContent></Card>;
}

function EmptyRow({ columns, label }: { columns: number; label: string }) {
  return <TableRow><TableCell colSpan={columns} className="h-24 text-center text-muted-foreground">{label}</TableCell></TableRow>;
}
