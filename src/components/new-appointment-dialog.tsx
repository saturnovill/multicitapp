"use client";

import { useActionState, useMemo, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { CalendarPlus, Check, ChevronsUpDown, LoaderCircle, Plus } from "lucide-react";

import { createAppointmentAction, type AppointmentActionState } from "@/app/app/appointment-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

type EmployeeOption = { id: string; name: string };
type CustomerOption = { id: string; name: string; phone: string | null; email: string | null };
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

function CustomerSelect({
  customers,
  value,
  onValueChange,
}: {
  customers: CustomerOption[];
  value: string;
  onValueChange: (customerId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedCustomer = customers.find((customer) => customer.id === value);
  const normalizedQuery = query.trim().toLocaleLowerCase("es-MX");
  const matches = customers.filter((customer) =>
    `${customer.name} ${customer.phone ?? ""} ${customer.email ?? ""}`.toLocaleLowerCase("es-MX").includes(normalizedQuery),
  );

  return (
    <>
      <input type="hidden" name="customerId" value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
            <span className="truncate">{selectedCustomer ? `${selectedCustomer.name}${selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ""}` : "Registrar cliente nuevo"}</span>
            <ChevronsUpDown className="shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width)">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}
            placeholder="Buscar por nombre, teléfono o correo"
            aria-label="Buscar cliente existente"
          />
          <div role="listbox" className="mt-2 max-h-56 overflow-y-auto" aria-label="Clientes existentes">
            <button
              type="button"
              role="option"
              aria-selected={!value}
              onClick={() => { onValueChange(""); setOpen(false); setQuery(""); }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted"
            >
              <span className="flex size-4 items-center justify-center">{!value ? <Check className="size-4" /> : null}</span>
              Registrar cliente nuevo
            </button>
            {matches.map((customer) => (
              <button
                key={customer.id}
                type="button"
                role="option"
                aria-selected={customer.id === value}
                onClick={() => { onValueChange(customer.id); setOpen(false); setQuery(""); }}
                className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted"
              >
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">{customer.id === value ? <Check className="size-4" /> : null}</span>
                <span className="min-w-0"><span className="block truncate font-medium">{customer.name}</span><span className="block truncate text-xs text-muted-foreground">{customer.phone ?? customer.email ?? "Sin datos de contacto"}</span></span>
              </button>
            ))}
            {!matches.length ? <p className="px-2 py-3 text-sm text-muted-foreground">No se encontraron clientes.</p> : null}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

function ServicesSelect({
  services,
  selectedIds,
  onSelectedIdsChange,
}: {
  services: ServiceOption[];
  selectedIds: string[];
  onSelectedIdsChange: (serviceIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("es-MX");
  const matches = services.filter((service) => service.name.toLocaleLowerCase("es-MX").includes(normalizedQuery));
  const selectedServices = services.filter((service) => selectedIds.includes(service.id));
  const selectionLabel = selectedServices.length
    ? selectedServices.map((service) => service.name).join(", ")
    : "Buscar y seleccionar servicios";

  function toggleService(serviceId: string) {
    onSelectedIdsChange(selectedIds.includes(serviceId)
      ? selectedIds.filter((id) => id !== serviceId)
      : [...selectedIds, serviceId]);
  }

  return (
    <>
      {selectedIds.map((serviceId) => <input key={serviceId} type="hidden" name="serviceIds" value={serviceId} />)}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
            <span className="truncate">{selectionLabel}</span>
            <ChevronsUpDown className="shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width)">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }}
            placeholder="Buscar servicios"
            aria-label="Buscar servicios"
          />
          <div role="listbox" aria-multiselectable className="mt-2 max-h-64 overflow-y-auto" aria-label="Servicios disponibles">
            {matches.map((service) => {
              const isSelected = selectedIds.includes(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggleService(service.id)}
                  className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left outline-none hover:bg-muted focus-visible:bg-muted"
                >
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">{isSelected ? <Check className="size-4" /> : null}</span>
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{service.name}</span><span className="block text-xs text-muted-foreground">{service.durationMinutes} min · {new Intl.NumberFormat("es-MX", { style: "currency", currency: service.currency }).format(service.priceCents / 100)}</span></span>
                </button>
              );
            })}
            {!matches.length ? <p className="px-2 py-3 text-sm text-muted-foreground">No se encontraron servicios.</p> : null}
          </div>
        </PopoverContent>
      </Popover>
    </>
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
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  function resetFormSelections() {
    setSelectedServices([]);
    setSelectedCustomerId("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
  }

  function handleCustomerChange(customerId: string) {
    setSelectedCustomerId(customerId);
    const customer = customers.find((candidate) => candidate.id === customerId);
    setCustomerName(customer?.name ?? "");
    setCustomerPhone(customer?.phone ?? "");
    setCustomerEmail(customer?.email ?? "");
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) resetFormSelections();
  }

  const [state, action] = useActionState(async (previousState: AppointmentActionState, formData: FormData) => {
    const nextState = await createAppointmentAction(previousState, formData);
    if (nextState.status === "success") handleOpenChange(false);
    return nextState;
  }, initialState);

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
      onOpenChange={handleOpenChange}
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
            <div className="space-y-2"><Label htmlFor="appointmentCustomer">Cliente existente (opcional)</Label><CustomerSelect customers={customers} value={selectedCustomerId} onValueChange={handleCustomerChange} /></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2"><Label htmlFor="newCustomerName">Nombre {selectedCustomerId ? "del cliente" : "nuevo"}</Label><Input id="newCustomerName" name="customerName" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Solo si es nuevo" maxLength={160} /></div>
              <div className="space-y-2"><Label htmlFor="newCustomerPhone">Teléfono</Label><Input id="newCustomerPhone" name="customerPhone" type="tel" value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} maxLength={32} /></div>
              <div className="space-y-2"><Label htmlFor="newCustomerEmail">Correo</Label><Input id="newCustomerEmail" name="customerEmail" type="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} /></div>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <div className="flex items-center justify-between gap-3"><legend className="text-sm font-medium">Servicios</legend><span className="text-xs text-muted-foreground">{summary.minutes} min · {new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(summary.cents / 100)}</span></div>
            {services.length ? <ServicesSelect services={services} selectedIds={selectedServices} onSelectedIdsChange={setSelectedServices} /> : (
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
