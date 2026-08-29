import Link from "next/link";
import { and, asc, count, desc, eq, ilike, max, or, type SQL } from "drizzle-orm";
import { ChevronRight, Search } from "lucide-react";

import { CustomerForm } from "@/components/customer-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db";
import { appointments, companies, customers } from "@/db/schema";

export async function CustomerDirectory({ companyId, detailBasePath, canManage, showCompany, query = "" }: { companyId?: string; detailBasePath: string; canManage: boolean; showCompany: boolean; query?: string }) {
  const db = getDb();
  const q = query.trim().slice(0, 100);
  const conditions: SQL[] = [];
  if (companyId) conditions.push(eq(customers.companyId, companyId));
  if (q) conditions.push(or(ilike(customers.name, `%${q}%`), ilike(customers.phone, `%${q}%`), ilike(customers.email, `%${q}%`))!);
  const [rows, companyRows] = await Promise.all([
    db.select({ id: customers.id, companyId: customers.companyId, name: customers.name, phone: customers.phone, email: customers.email, companyName: companies.name, appointmentCount: count(appointments.id), lastAppointment: max(appointments.startsAt) }).from(customers).innerJoin(companies, eq(companies.id, customers.companyId)).leftJoin(appointments, and(eq(appointments.customerId, customers.id), eq(appointments.companyId, customers.companyId))).where(conditions.length ? and(...conditions) : undefined).groupBy(customers.id, customers.companyId, customers.name, customers.phone, customers.email, companies.name).orderBy(desc(max(appointments.startsAt)), asc(customers.name)).limit(500),
    companyId ? Promise.resolve([]) : db.select({ id: companies.id, name: companies.name }).from(companies).where(eq(companies.status, "active")).orderBy(asc(companies.name)),
  ]);
  return <div className="space-y-5"><Card><CardContent className="pt-6"><form className="flex max-w-xl gap-2"><Input name="q" defaultValue={q} placeholder="Nombre, teléfono o correo" /><Button type="submit"><Search />Buscar</Button>{q ? <Button variant="outline" asChild><Link href="?">Limpiar</Link></Button> : null}</form></CardContent></Card><div className={canManage ? "grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_390px]" : undefined}><Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Cliente</TableHead>{showCompany ? <TableHead>Empresa</TableHead> : null}<TableHead>Citas</TableHead><TableHead>Última cita</TableHead><TableHead className="w-16" /></TableRow></TableHeader><TableBody>{rows.map((customer) => <TableRow key={customer.id}><TableCell><p className="font-medium">{customer.name}</p><p className="text-xs text-muted-foreground">{customer.phone ?? customer.email ?? "Sin contacto"}</p></TableCell>{showCompany ? <TableCell>{customer.companyName}</TableCell> : null}<TableCell>{customer.appointmentCount}</TableCell><TableCell>{customer.lastAppointment ? new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(customer.lastAppointment) : "Sin citas"}</TableCell><TableCell><Button variant="ghost" size="icon-sm" asChild><Link href={`${detailBasePath}/${customer.id}`} aria-label={`Abrir ${customer.name}`}><ChevronRight /></Link></Button></TableCell></TableRow>)}{!rows.length ? <TableRow><TableCell colSpan={showCompany ? 5 : 4} className="h-28 text-center text-muted-foreground">No se encontraron clientes.</TableCell></TableRow> : null}</TableBody></Table></CardContent></Card>{canManage ? <CustomerForm companies={companyRows} fixedCompanyId={companyId} /> : null}</div></div>;
}
