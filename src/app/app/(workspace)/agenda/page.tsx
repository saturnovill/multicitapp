import Link from "next/link";
import { and, asc, eq, sql } from "drizzle-orm";
import { ChevronLeft, ChevronRight, MapPin, Plus } from "lucide-react";
import { redirect } from "next/navigation";

import { DailyCalendar } from "@/components/daily-calendar";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import {
  appointments,
  customers,
  employeeBranches,
  employees,
} from "@/db/schema";
import { getAuthSession } from "@/lib/auth/server";
import { getTenantContext } from "@/lib/tenant";

function validDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { data: session } = await getAuthSession();
  if (!session?.user) redirect("/login");

  const context = await getTenantContext(session.user.id);
  if (!context) redirect("/app/onboarding");
  if (!context.branch) throw new Error("La empresa no tiene una sucursal activa");

  const params = await searchParams;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: context.branch.timezone ?? context.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const date = validDate(typeof params.date === "string" ? params.date : undefined) ?? today;
  const timezone = context.branch.timezone ?? context.timezone;
  const db = getDb();

  const [team, dailyAppointments] = await Promise.all([
    db
      .select({ id: employees.id, name: employees.name, color: employees.color })
      .from(employees)
      .innerJoin(
        employeeBranches,
        and(
          eq(employeeBranches.employeeId, employees.id),
          eq(employeeBranches.companyId, context.companyId),
        ),
      )
      .where(
        and(
          eq(employees.companyId, context.companyId),
          eq(employeeBranches.branchId, context.branch.id),
          eq(employees.status, "active"),
        ),
      )
      .orderBy(asc(employees.name)),
    db
      .select({
        id: appointments.id,
        employeeId: appointments.employeeId,
        customerName: customers.name,
        startsAt: appointments.startsAt,
        endsAt: appointments.endsAt,
        status: appointments.status,
      })
      .from(appointments)
      .innerJoin(
        customers,
        and(
          eq(customers.id, appointments.customerId),
          eq(customers.companyId, context.companyId),
        ),
      )
      .where(
        and(
          eq(appointments.companyId, context.companyId),
          eq(appointments.branchId, context.branch.id),
          sql`${appointments.startsAt} >= (${date}::date::timestamp at time zone ${timezone})`,
          sql`${appointments.startsAt} < ((${date}::date + interval '1 day')::timestamp at time zone ${timezone})`,
        ),
      )
      .orderBy(asc(appointments.startsAt)),
  ]);

  const label = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-violet-700">
            <MapPin className="size-3.5" aria-hidden="true" />
            {context.branch.name}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Agenda diaria</h1>
          <p className="mt-1 capitalize text-sm text-muted-foreground">{label}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border bg-white p-1 shadow-sm">
            <Button variant="ghost" size="icon-sm" asChild aria-label="Día anterior">
              <Link href={`/app/agenda?date=${shiftDate(date, -1)}`}>
                <ChevronLeft className="size-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/agenda">Hoy</Link>
            </Button>
            <Button variant="ghost" size="icon-sm" asChild aria-label="Día siguiente">
              <Link href={`/app/agenda?date=${shiftDate(date, 1)}`}>
                <ChevronRight className="size-4" />
              </Link>
            </Button>
          </div>
          <Button className="bg-violet-600 hover:bg-violet-700" disabled>
            <Plus className="size-4" aria-hidden="true" />
            Nueva cita
          </Button>
        </div>
      </header>

      <DailyCalendar
        employees={team}
        appointments={dailyAppointments}
        timezone={timezone}
      />
    </div>
  );
}
