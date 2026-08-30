import Link from "next/link";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { CalendarDays, Search, ShoppingCart } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db";
import { appointments, branches, companies, customers, employees } from "@/db/schema";

const statuses = ["pending", "confirmed", "waiting", "in_service", "completed", "cancelled", "no_show"] as const;
const statusLabel: Record<(typeof statuses)[number], string> = { pending: "Pendiente", confirmed: "Confirmada", waiting: "En espera", in_service: "En servicio", completed: "Completada", cancelled: "Cancelada", no_show: "No asistió" };

export type AppointmentFilters = { from?: string | string[]; to?: string | string[]; status?: string | string[]; branchId?: string | string[]; q?: string | string[] };
const single = (value: string | string[] | undefined) => typeof value === "string" ? value : "";
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());

export async function AppointmentList({ filters, companyId, employeeId, calendarBasePath, showCompany }: {
  filters: AppointmentFilters;
  companyId?: string;
  employeeId?: string;
  calendarBasePath: string;
  showCompany: boolean;
}) {
  const from = single(filters.from);
  const to = single(filters.to);
  const branchId = z.uuid().safeParse(single(filters.branchId)).data;
  const parsedStatus = z.enum(statuses).safeParse(single(filters.status)).data;
  const q = single(filters.q).trim().slice(0, 100);
  const conditions: SQL[] = [];
  if (companyId) conditions.push(eq(appointments.companyId, companyId));
  if (employeeId) conditions.push(eq(appointments.employeeId, employeeId));
  if (branchId) conditions.push(eq(appointments.branchId, branchId));
  if (parsedStatus) conditions.push(eq(appointments.status, parsedStatus));
  if (q) conditions.push(or(ilike(customers.name, `%${q}%`), ilike(employees.name, `%${q}%`))!);
  if (validDate(from)) conditions.push(sql`(${appointments.startsAt} at time zone coalesce(${branches.timezone}, ${companies.timezone}))::date >= ${from}::date`);
  if (validDate(to)) conditions.push(sql`(${appointments.startsAt} at time zone coalesce(${branches.timezone}, ${companies.timezone}))::date <= ${to}::date`);

  const db = getDb();
  const [rows, branchRows] = await Promise.all([
    db.select({ id: appointments.id, companyId: appointments.companyId, startsAt: appointments.startsAt, status: appointments.status, total: appointments.estimatedTotalCents, customerName: customers.name, employeeName: employees.name, branchId: branches.id, branchName: branches.name, branchTimezone: branches.timezone, companyName: companies.name, companyTimezone: companies.timezone, currency: companies.currency }).from(appointments).innerJoin(customers, and(eq(customers.id, appointments.customerId), eq(customers.companyId, appointments.companyId))).innerJoin(employees, and(eq(employees.id, appointments.employeeId), eq(employees.companyId, appointments.companyId))).innerJoin(branches, and(eq(branches.id, appointments.branchId), eq(branches.companyId, appointments.companyId))).innerJoin(companies, eq(companies.id, appointments.companyId)).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(appointments.startsAt)).limit(250),
    db.select({ id: branches.id, name: branches.name, companyName: companies.name }).from(branches).innerJoin(companies, eq(companies.id, branches.companyId)).where(companyId ? eq(branches.companyId, companyId) : undefined).orderBy(asc(companies.name), asc(branches.name)),
  ]);

  return (
    <div className="space-y-5">
      <Card><CardContent className="pt-6"><form className="grid gap-3 md:grid-cols-6"><Input name="q" defaultValue={q} placeholder="Cliente o empleado" className="md:col-span-2" /><Input name="from" type="date" defaultValue={from} aria-label="Desde" /><Input name="to" type="date" defaultValue={to} aria-label="Hasta" /><select name="branchId" defaultValue={branchId ?? ""} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"><option value="">Todas las sucursales</option>{branchRows.map((branch) => <option key={branch.id} value={branch.id}>{showCompany ? `${branch.companyName} · ` : ""}{branch.name}</option>)}</select><select name="status" defaultValue={parsedStatus ?? ""} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"><option value="">Todos los estados</option>{statuses.map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}</select><div className="flex gap-2 md:col-span-6"><Button type="submit"><Search />Filtrar</Button><Button variant="outline" asChild><Link href="?">Limpiar</Link></Button></div></form></CardContent></Card>
      <div className="overflow-hidden rounded-xl border bg-white"><Table><TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead><TableHead>Empleado</TableHead>{showCompany ? <TableHead>Empresa</TableHead> : null}<TableHead>Sucursal</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="w-28" /></TableRow></TableHeader><TableBody>{rows.map((row) => { const timezone = row.branchTimezone ?? row.companyTimezone; const date = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(row.startsAt); const saleHref = showCompany ? `/app/admin/ventas/nueva?companyId=${row.companyId}&appointmentId=${row.id}` : `/app/ventas/nueva?appointmentId=${row.id}`; return <TableRow key={row.id}><TableCell className="whitespace-nowrap">{new Intl.DateTimeFormat("es-MX", { timeZone: timezone, dateStyle: "medium", timeStyle: "short" }).format(row.startsAt)}</TableCell><TableCell className="font-medium">{row.customerName}</TableCell><TableCell>{row.employeeName}</TableCell>{showCompany ? <TableCell>{row.companyName}</TableCell> : null}<TableCell>{row.branchName}</TableCell><TableCell><Badge variant={row.status === "cancelled" ? "outline" : "secondary"}>{statusLabel[row.status]}</Badge></TableCell><TableCell className="text-right">{new Intl.NumberFormat("es-MX", { style: "currency", currency: row.currency }).format(row.total / 100)}</TableCell><TableCell><div className="flex"><Button size="sm" variant="ghost" asChild><Link href={`${calendarBasePath}/${row.branchId}?date=${date}`} aria-label="Abrir en calendario"><CalendarDays /></Link></Button>{!["completed", "cancelled", "no_show"].includes(row.status) ? <Button size="sm" variant="ghost" asChild><Link href={saleHref} aria-label="Convertir en venta"><ShoppingCart /></Link></Button> : null}</div></TableCell></TableRow>; })}{rows.length === 0 ? <TableRow><TableCell colSpan={showCompany ? 8 : 7} className="h-32 text-center text-muted-foreground">No se encontraron citas con estos filtros.</TableCell></TableRow> : null}</TableBody></Table></div>
      {rows.length === 250 ? <p className="text-xs text-muted-foreground">Se muestran las 250 citas más recientes del filtro actual.</p> : null}
    </div>
  );
}
