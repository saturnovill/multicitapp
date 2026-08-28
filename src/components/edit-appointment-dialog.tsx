"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Ban, LoaderCircle, Save } from "lucide-react";

import { cancelAppointmentAction, updateAppointmentAction, type AppointmentActionState } from "@/app/app/appointment-actions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type EditableAppointment = {
  id: string;
  employeeId: string;
  customerId: string;
  customerName: string;
  startsAt: string;
  endsAt: string;
  status: string;
  notes: string | null;
  serviceIds: string[];
};

type EmployeeOption = { id: string; name: string };
type CustomerOption = { id: string; name: string; phone: string | null };
type ServiceOption = { id: string; name: string; durationMinutes: number; priceCents: number; currency: string };
const initialState: AppointmentActionState = { status: "idle" };

function dateParts(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={disabled || pending} className="bg-violet-600 hover:bg-violet-700">{pending ? <LoaderCircle className="animate-spin" /> : <Save />}Guardar cambios</Button>;
}

export function EditAppointmentDialog({ open, onOpenChange, appointment, companyId, branchId, timezone, employees, customers, services }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: EditableAppointment;
  companyId: string;
  branchId: string;
  timezone: string;
  employees: EmployeeOption[];
  customers: CustomerOption[];
  services: ServiceOption[];
}) {
  const [state, updateAction] = useActionState(updateAppointmentAction, initialState);
  const [cancelState, cancelAction] = useActionState(cancelAppointmentAction, initialState);
  const [selectedServices, setSelectedServices] = useState(appointment.serviceIds);
  const localStart = dateParts(appointment.startsAt, timezone);
  const summary = useMemo(() => services.reduce((total, service) => selectedServices.includes(service.id) ? { minutes: total.minutes + service.durationMinutes, cents: total.cents + service.priceCents } : total, { minutes: 0, cents: 0 }), [selectedServices, services]);
  const currency = services[0]?.currency ?? "MXN";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Editar cita</DialogTitle><DialogDescription>Reprograma la cita, cambia al colaborador o actualiza su estado y servicios.</DialogDescription></DialogHeader>
        <form action={updateAction} className="space-y-5">
          <input type="hidden" name="appointmentId" value={appointment.id} />
          <input type="hidden" name="companyId" value={companyId} />
          <input type="hidden" name="branchId" value={branchId} />
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="editEmployee">Empleado</Label><select id="editEmployee" name="employeeId" required defaultValue={appointment.employeeId} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></div>
            <div className="space-y-2"><Label htmlFor="editStatus">Estado</Label><select id="editStatus" name="status" defaultValue={appointment.status} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><option value="pending">Pendiente</option><option value="confirmed">Confirmada</option><option value="waiting">En espera</option><option value="in_service">En servicio</option><option value="completed">Completada</option><option value="cancelled">Cancelada</option><option value="no_show">No asistió</option></select></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="editDate">Fecha</Label><Input id="editDate" name="date" type="date" defaultValue={localStart.date} required /></div><div className="space-y-2"><Label htmlFor="editTime">Hora</Label><Input id="editTime" name="time" type="time" step={900} defaultValue={localStart.time} required /></div></div>
          <div className="space-y-2"><Label htmlFor="editCustomer">Cliente</Label><select id="editCustomer" name="customerId" required defaultValue={appointment.customerId} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}</select></div>
          <fieldset className="space-y-3"><div className="flex items-center justify-between gap-3"><legend className="text-sm font-medium">Servicios</legend><span className="text-xs text-muted-foreground">{summary.minutes} min · {new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(summary.cents / 100)}</span></div><div className="grid gap-2 sm:grid-cols-2">{services.map((service) => <label key={service.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-checked:border-violet-300 has-checked:bg-violet-50/60"><input type="checkbox" name="serviceIds" value={service.id} checked={selectedServices.includes(service.id)} onChange={(event) => setSelectedServices((current) => event.target.checked ? [...current, service.id] : current.filter((id) => id !== service.id))} className="mt-0.5 size-4 accent-violet-600" /><span><span className="block text-sm font-medium">{service.name}</span><span className="text-xs text-muted-foreground">{service.durationMinutes} min · {new Intl.NumberFormat("es-MX", { style: "currency", currency: service.currency }).format(service.priceCents / 100)}</span></span></label>)}</div></fieldset>
          <div className="space-y-2"><Label htmlFor="editNotes">Notas</Label><Textarea id="editNotes" name="notes" defaultValue={appointment.notes ?? ""} rows={3} maxLength={2000} /></div>
          {state.status !== "idle" ? <p role="status" className={state.status === "success" ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"}>{state.message}</p> : null}
          {cancelState.status === "error" ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{cancelState.message}</p> : null}
          <DialogFooter className="mx-0 mb-0 px-0 pb-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button><SaveButton disabled={selectedServices.length === 0} />
          </DialogFooter>
        </form>
        <AlertDialog><AlertDialogTrigger asChild><Button type="button" variant="destructive" className="justify-self-start" disabled={appointment.status === "cancelled"}><Ban />Cancelar cita</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Cancelar esta cita?</AlertDialogTitle><AlertDialogDescription>La cita conservará su historial, pero dejará libre el horario del empleado.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Volver</AlertDialogCancel><form action={cancelAction}><input type="hidden" name="appointmentId" value={appointment.id} /><input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="branchId" value={branchId} /><AlertDialogAction type="submit" variant="destructive">Sí, cancelar</AlertDialogAction></form></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
