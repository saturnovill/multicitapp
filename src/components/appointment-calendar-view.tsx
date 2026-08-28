import Link from "next/link";
import { and, asc, eq, sql } from "drizzle-orm";
import { ArrowLeftRight, ChevronLeft, ChevronRight, MapPin, Plus } from "lucide-react";

import { DailyCalendar } from "@/components/daily-calendar";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { appointments, customers, employeeBranches, employees } from "@/db/schema";

type AppointmentCalendarViewProps = {
  companyId: string;
  branch: { id: string; name: string; timezone: string | null };
  companyTimezone: string;
  basePath: string;
  selectedDate?: string;
  selectorHref?: string;
};

function validDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10) === value ? value : null;
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export async function AppointmentCalendarView({
  companyId,
  branch,
  companyTimezone,
  basePath,
  selectedDate,
  selectorHref,
}: AppointmentCalendarViewProps) {
  const timezone = branch.timezone ?? companyTimezone;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const date = validDate(selectedDate) ?? today;
  const db = getDb();

  const [team, dailyAppointments] = await Promise.all([
    db
      .select({ id: employees.id, name: employees.name, color: employees.color })
      .from(employees)
      .innerJoin(
        employeeBranches,
        and(
          eq(employeeBranches.employeeId, employees.id),
          eq(employeeBranches.companyId, companyId),
        ),
      )
      .where(
        and(
          eq(employees.companyId, companyId),
          eq(employeeBranches.branchId, branch.id),
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
        and(eq(customers.id, appointments.customerId), eq(customers.companyId, companyId)),
      )
      .where(
        and(
          eq(appointments.companyId, companyId),
          eq(appointments.branchId, branch.id),
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
            {branch.name}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Citas</h1>
          <p className="mt-1 capitalize text-sm text-muted-foreground">{label}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectorHref ? (
            <Button variant="outline" asChild>
              <Link href={selectorHref}><ArrowLeftRight /> Cambiar sucursal</Link>
            </Button>
          ) : null}
          <div className="flex items-center rounded-lg border bg-white p-1 shadow-sm">
            <Button variant="ghost" size="icon-sm" asChild aria-label="Día anterior">
              <Link href={`${basePath}?date=${shiftDate(date, -1)}`}><ChevronLeft /></Link>
            </Button>
            <Button variant="ghost" size="sm" asChild><Link href={basePath}>Hoy</Link></Button>
            <Button variant="ghost" size="icon-sm" asChild aria-label="Día siguiente">
              <Link href={`${basePath}?date=${shiftDate(date, 1)}`}><ChevronRight /></Link>
            </Button>
          </div>
          <Button className="bg-violet-600 hover:bg-violet-700" disabled>
            <Plus aria-hidden="true" /> Nueva cita
          </Button>
        </div>
      </header>
      <DailyCalendar employees={team} appointments={dailyAppointments} timezone={timezone} />
    </div>
  );
}
