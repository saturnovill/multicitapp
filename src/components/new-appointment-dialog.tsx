"use client";

import { useActionState, useMemo, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CalendarPlus, LoaderCircle, Plus } from "lucide-react";

import { createAppointmentAction, type AppointmentActionState } from "@/app/app/appointment-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type EmployeeOption = { id: string; name: string };
type CustomerOption = { id: string; name: string; phone: string | null };
type ServiceOption = { id: string; name: string; durationMinutes: number; priceCents: number; currency: string };

const initialState: AppointmentActionState = { status: "idle" };

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="bg-violet-600 hover:bg-violet-700" disabled={disabled || pending}>
      {pending ? <LoaderCircle className="animate-spin" /> : <CalendarPlus />}
      Guardar cita
    </Button>
  );
}

export function NewAppointmentDialog({
  companyId,
  branchId,
  date,
  employees,
  customers,
  services,
  defaultEmployeeId = "",
  defaultTime = "09:00",
  intervalMinutes = 15,
  controlledOpen,
  onControlledOpenChange,
  trigger,
}: {
  companyId: string;
  branchId: string;
  date: string;
  employees: EmployeeOption[];
  customers: CustomerOption[];
  services: ServiceOption[];
  defaultEmployeeId?: string;
  defaultTime?: string;
  intervalMinutes?: number;
  controlledOpen?: boolean;
  onControlledOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onControlledOpenChange ?? setInternalOpen;
  const [state, action] = useActionState(createAppointmentAction, initialState);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const summary = useMemo(() => {
    const selected = new Set(selectedServices);
    return services.reduce(
      (total, service) => selected.has(service.id)
        ? { minutes: total.minutes + service.durationMinutes, cents: total.cents + service.priceCents }
        : total,
      { minutes: 0, cents: 0 },
    );
  }, [selectedServices, services]);

  const currency = services[0]?.currency ?? "MXN";
  const ready = employees.length > 0 && services.length > 0 && selectedServices.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSelectedServices([]);
      }}
    >
      {controlledOpen === undefined ? <DialogTrigger asChild>{trigger ?? <Button className="bg-violet-600 hover:bg-violet-700"><Plus /> Nueva cita</Button>}</DialogTrigger> : null}
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar cita</DialogTitle>
          <DialogDescription>Selecciona cliente, empleado, horario y uno o más servicios.</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-5">
          <input type="hidden" name="companyId" value={companyId} />
          <input type="hidden" name="branchId" value={branchId} />

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="appointmentEmployee">Empleado</Label>
              <select id="appointmentEmployee" name="employeeId" required defaultValue={defaultEmployeeId} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
                <option value="" disabled>Seleccionar</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label htmlFor="appointmentStatus">Estado</Label><select id="appointmentStatus" name="status" defaultValue="confirmed" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"><option value="pending">Pendiente</option><option value="confirmed">Confirmada</option><option value="waiting">En espera</option></select></div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="appointmentDate">Fecha</Label><Input id="appointmentDate" name="date" type="date" defaultValue={date} required /></div>
            <div className="space-y-2"><Label htmlFor="appointmentTime">Hora de inicio</Label><Input id="appointmentTime" name="time" type="time" min="08:00" max="20:00" step={intervalMinutes * 60} defaultValue={defaultTime} required /></div>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Cliente</legend>
            <div className="space-y-2"><Label htmlFor="appointmentCustomer">Cliente existente (opcional)</Label><select id="appointmentCustomer" name="customerId" defaultValue="" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"><option value="">Registrar cliente nuevo</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}</select></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2"><Label htmlFor="newCustomerName">Nombre nuevo</Label><Input id="newCustomerName" name="customerName" placeholder="Solo si es nuevo" maxLength={160} /></div>
              <div className="space-y-2"><Label htmlFor="newCustomerPhone">Teléfono</Label><Input id="newCustomerPhone" name="customerPhone" type="tel" maxLength={32} /></div>
              <div className="space-y-2"><Label htmlFor="newCustomerEmail">Correo</Label><Input id="newCustomerEmail" name="customerEmail" type="email" /></div>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <div className="flex items-center justify-between gap-3"><legend className="text-sm font-medium">Servicios</legend><span className="text-xs text-muted-foreground">{summary.minutes} min · {new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(summary.cents / 100)}</span></div>
            {services.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {services.map((service) => (
                  <label key={service.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-checked:border-violet-300 has-checked:bg-violet-50/60">
                    <input
                      type="checkbox"
                      name="serviceIds"
                      value={service.id}
                      checked={selectedServices.includes(service.id)}
                      onChange={(event) => setSelectedServices((current) => event.target.checked ? [...current, service.id] : current.filter((id) => id !== service.id))}
                      className="mt-0.5 size-4 accent-violet-600"
                    />
                    <span><span className="block text-sm font-medium">{service.name}</span><span className="text-xs text-muted-foreground">{service.durationMinutes} min · {new Intl.NumberFormat("es-MX", { style: "currency", currency: service.currency }).format(service.priceCents / 100)}</span></span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No hay servicios activos. Créelos desde la sección Servicios antes de registrar una cita.</p>
            )}
          </fieldset>

          <div className="space-y-2"><Label htmlFor="appointmentNotes">Notas</Label><Textarea id="appointmentNotes" name="notes" rows={3} maxLength={2000} /></div>
          {state.status !== "idle" ? <p role="status" className={state.status === "success" ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"}>{state.message}</p> : null}
          <DialogFooter className="mx-0 mb-0 px-0 pb-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <SubmitButton disabled={!ready} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
