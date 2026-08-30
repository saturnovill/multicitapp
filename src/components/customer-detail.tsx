import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { notFound } from "next/navigation";

import { CustomerForm } from "@/components/customer-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDb } from "@/db";
import {
  appointments,
  branches,
  companies,
  customers,
  employees,
  sales,
} from "@/db/schema";

const labels: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  waiting: "En espera",
  in_service: "En servicio",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

export async function CustomerDetail({
  customerId,
  companyId,
  backHref,
  calendarBasePath,
  canManage,
}: {
  customerId: string;
  companyId?: string;
  backHref: string;
  calendarBasePath: string;
  canManage: boolean;
}) {
  const db = getDb();
  const [customer] = await db
    .select({
      id: customers.id,
      companyId: customers.companyId,
      name: customers.name,
      phone: customers.phone,
      email: customers.email,
      notes: customers.notes,
      companyName: companies.name,
    })
    .from(customers)
    .innerJoin(companies, eq(companies.id, customers.companyId))
    .where(
      companyId
        ? and(eq(customers.id, customerId), eq(customers.companyId, companyId))
        : eq(customers.id, customerId),
    )
    .limit(1);
  if (!customer) notFound();
  const [history, saleHistory] = await Promise.all([
    db
      .select({
        id: appointments.id,
        startsAt: appointments.startsAt,
        status: appointments.status,
        total: appointments.estimatedTotalCents,
        branchId: branches.id,
        branchName: branches.name,
        timezone: branches.timezone,
        companyTimezone: companies.timezone,
        employeeName: employees.name,
        currency: companies.currency,
      })
      .from(appointments)
      .innerJoin(
        branches,
        and(
          eq(branches.id, appointments.branchId),
          eq(branches.companyId, customer.companyId),
        ),
      )
      .innerJoin(companies, eq(companies.id, customer.companyId))
      .innerJoin(
        employees,
        and(
          eq(employees.id, appointments.employeeId),
          eq(employees.companyId, customer.companyId),
        ),
      )
      .where(
        and(
          eq(appointments.companyId, customer.companyId),
          eq(appointments.customerId, customer.id),
        ),
      )
      .orderBy(desc(appointments.startsAt))
      .limit(100),
    db
      .select({
        id: sales.id,
        folio: sales.folio,
        createdAt: sales.createdAt,
        status: sales.status,
        total: sales.totalCents,
        currency: sales.currency,
        branchName: branches.name,
      })
      .from(sales)
      .innerJoin(
        branches,
        and(
          eq(branches.id, sales.branchId),
          eq(branches.companyId, customer.companyId),
        ),
      )
      .where(
        and(
          eq(sales.companyId, customer.companyId),
          eq(sales.customerId, customer.id),
        ),
      )
      .orderBy(desc(sales.createdAt))
      .limit(100),
  ]);
  const salesBasePath = calendarBasePath.startsWith("/app/admin")
    ? "/app/admin/ventas"
    : "/app/ventas";
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-7">
        <Button variant="ghost" size="sm" asChild className="-ml-3">
          <Link href={backHref}>
            <ArrowLeft />
            Volver
          </Link>
        </Button>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {customer.name}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {customer.companyName} ·{" "}
          {customer.phone ?? customer.email ?? "Sin contacto"}
        </p>
      </header>
      <div className="grid items-start gap-6 2xl:grid-cols-[390px_minmax(0,1fr)]">
        {canManage ? (
          <CustomerForm
            companies={[]}
            fixedCompanyId={customer.companyId}
            customer={customer}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Contacto</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {customer.phone ?? "Sin teléfono"}
              <br />
              {customer.email ?? "Sin correo"}
            </CardContent>
          </Card>
        )}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de compras</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Folio</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saleHistory.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <Link
                          className="font-medium hover:underline"
                          href={`${salesBasePath}/${sale.id}`}
                        >
                          {sale.folio}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {new Intl.DateTimeFormat("es-MX", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(sale.createdAt)}
                      </TableCell>
                      <TableCell>{sale.branchName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                            {sale.status === "completed" ? "Completada" : "Cancelada"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat("es-MX", {
                          style: "currency",
                          currency: sale.currency,
                        }).format(sale.total / 100)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!saleHistory.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Este cliente aún no tiene compras.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Historial de citas</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Sucursal</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((appointment) => {
                    const timezone =
                      appointment.timezone ?? appointment.companyTimezone;
                    const date = new Intl.DateTimeFormat("en-CA", {
                      timeZone: timezone,
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    }).format(appointment.startsAt);
                    return (
                      <TableRow key={appointment.id}>
                        <TableCell>
                          {new Intl.DateTimeFormat("es-MX", {
                            timeZone: timezone,
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(appointment.startsAt)}
                        </TableCell>
                        <TableCell>{appointment.branchName}</TableCell>
                        <TableCell>{appointment.employeeName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {labels[appointment.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat("es-MX", {
                            style: "currency",
                            currency: appointment.currency,
                          }).format(appointment.total / 100)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon-sm" asChild>
                            <Link
                              href={`${calendarBasePath}/${appointment.branchId}?date=${date}`}
                              aria-label="Abrir en calendario"
                            >
                              <CalendarDays />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {!history.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-28 text-center text-muted-foreground"
                      >
                        Este cliente aún no tiene citas.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
