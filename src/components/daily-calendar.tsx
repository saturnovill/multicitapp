import { CalendarX2 } from "lucide-react";

type CalendarEmployee = {
  id: string;
  name: string;
  color: string;
};

type CalendarAppointment = {
  id: string;
  employeeId: string;
  customerName: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
};

type DailyCalendarProps = {
  employees: CalendarEmployee[];
  appointments: CalendarAppointment[];
  timezone: string;
};

const START_HOUR = 8;
const END_HOUR = 20;
const HOUR_HEIGHT = 96;
const hours = Array.from(
  { length: END_HOUR - START_HOUR + 1 },
  (_, index) => START_HOUR + index,
);

const statusLabel: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  waiting: "En espera",
  in_service: "En servicio",
  completed: "Completada",
};

function minutesInTimezone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );
  return hour * 60 + minute;
}

export function DailyCalendar({
  employees,
  appointments,
  timezone,
}: DailyCalendarProps) {
  if (employees.length === 0) {
    return (
      <div className="grid min-h-96 place-items-center rounded-xl border border-dashed bg-white p-8 text-center">
        <div>
          <CalendarX2 className="mx-auto size-8 text-stone-400" />
          <h2 className="mt-4 font-semibold">Agrega tu primer colaborador</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sus horarios aparecerán como una nueva columna en esta agenda.
          </p>
        </div>
      </div>
    );
  }

  const gridHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT;
  const appointmentsByEmployee = new Map<string, CalendarAppointment[]>();
  for (const appointment of appointments) {
    const employeeAppointments =
      appointmentsByEmployee.get(appointment.employeeId) ?? [];
    employeeAppointments.push(appointment);
    appointmentsByEmployee.set(appointment.employeeId, employeeAppointments);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="overflow-auto">
        <div
          className="grid min-w-max"
          style={{ gridTemplateColumns: `72px repeat(${employees.length}, minmax(220px, 1fr))` }}
        >
          <div className="sticky left-0 top-0 z-30 h-16 border-b border-r bg-stone-50/95 backdrop-blur" />
          {employees.map((employee) => (
            <div
              key={employee.id}
              className="sticky top-0 z-20 flex h-16 items-center justify-center gap-2 border-b border-r bg-stone-50/95 px-4 backdrop-blur last:border-r-0"
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: employee.color }}
              />
              <span className="truncate text-sm font-semibold">{employee.name}</span>
            </div>
          ))}

          <div
            className="sticky left-0 z-10 border-r bg-white"
            style={{ height: gridHeight }}
          >
            {hours.slice(0, -1).map((hour, index) => (
              <div
                key={hour}
                className="absolute w-full -translate-y-2 pr-3 text-right text-[11px] text-stone-400"
                style={{ top: index * HOUR_HEIGHT }}
              >
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {employees.map((employee) => (
            <div
              key={employee.id}
              className="relative border-r last:border-r-0"
              style={{
                height: gridHeight,
                backgroundImage:
                  "linear-gradient(to bottom, rgb(231 229 228) 1px, transparent 1px), linear-gradient(to bottom, rgb(245 245 244) 1px, transparent 1px)",
                backgroundSize: `100% ${HOUR_HEIGHT}px, 100% ${HOUR_HEIGHT / 2}px`,
              }}
            >
              {(appointmentsByEmployee.get(employee.id) ?? []).map(
                (appointment) => {
                  const start = minutesInTimezone(appointment.startsAt, timezone);
                  const end = minutesInTimezone(appointment.endsAt, timezone);
                  const top = ((start - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                  const height = Math.max(((end - start) / 60) * HOUR_HEIGHT, 44);

                  return (
                    <article
                      key={appointment.id}
                      className="absolute inset-x-2 overflow-hidden rounded-lg border-l-4 bg-violet-50 px-2.5 py-2 text-violet-950 shadow-sm"
                      style={{
                        top,
                        height,
                        borderLeftColor: employee.color,
                      }}
                    >
                      <p className="truncate text-xs font-semibold">
                        {appointment.customerName}
                      </p>
                      <p className="mt-0.5 text-[11px] text-violet-700">
                        {new Intl.DateTimeFormat("es-MX", {
                          timeZone: timezone,
                          hour: "2-digit",
                          minute: "2-digit",
                        }).format(appointment.startsAt)}{" "}
                        · {statusLabel[appointment.status] ?? appointment.status}
                      </p>
                    </article>
                  );
                },
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
