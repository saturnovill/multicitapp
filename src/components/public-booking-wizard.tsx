"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, CalendarClock, Check, CheckCircle2, Clock3, LoaderCircle, MapPin, Scissors, UserRound } from "lucide-react";

import { createPublicAppointmentAction, type PublicBookingActionState } from "@/app/reservar/[companySlug]/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PublicBookingCatalog, PublicBookingService, PublicBookingSlot } from "@/types/public-booking";

const initialState: PublicBookingActionState = { status: "idle" };
const steps = ["Sucursal", "Servicios", "Horario"];

function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function groupServices(services: PublicBookingService[]) {
  const groups = new Map<string, PublicBookingService[]>();
  for (const service of services) {
    const category = service.categoryName ?? "Otros servicios";
    groups.set(category, [...(groups.get(category) ?? []), service]);
  }
  return Array.from(groups.entries());
}

export function PublicBookingWizard({ catalog, minDate, maxDate }: { catalog: PublicBookingCatalog; minDate: string; maxDate: string }) {
  const [state, action, pending] = useActionState(createPublicAppointmentAction, initialState);
  const [step, setStep] = useState(1);
  const [branchId, setBranchId] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [employeeChoice, setEmployeeChoice] = useState("any");
  const [date, setDate] = useState(minDate);
  const [slots, setSlots] = useState<PublicBookingSlot[]>([]);
  const [chosenSlot, setChosenSlot] = useState<PublicBookingSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneConfirm, setPhoneConfirm] = useState("");

  const branch = catalog.branches.find((item) => item.id === branchId);
  const servicesForBranch = catalog.services.filter((service) => service.branchIds.includes(branchId)).map((service) => ({ ...service, priceCents: service.branchPrices.find((price) => price.branchId === branchId)?.priceCents ?? service.priceCents }));
  const selectedServices = servicesForBranch.filter((service) => serviceIds.includes(service.id));
  const durationMinutes = selectedServices.reduce((sum, service) => sum + service.durationMinutes, 0);
  const totalCents = selectedServices.reduce((sum, service) => sum + service.priceCents, 0);
  const money = useMemo(() => new Intl.NumberFormat("es-MX", { style: "currency", currency: catalog.company.currency }), [catalog.company.currency]);
  const groupedServices = groupServices(servicesForBranch);
  const eligibleEmployees = catalog.employees.filter((employee) => employee.branchId === branchId && (!employee.serviceIds.length || serviceIds.every((serviceId) => employee.serviceIds.includes(serviceId))));
  const matchingPhones = phoneDigits(phone).length >= 10 && phoneDigits(phone) === phoneDigits(phoneConfirm);

  function chooseBranch(nextBranchId: string) {
    setBranchId(nextBranchId);
    setServiceIds([]);
    setEmployeeChoice("any");
    setSlots([]);
    setChosenSlot(null);
    setSlotError("");
    setStep(2);
  }

  function toggleService(serviceId: string, checked: boolean) {
    const nextIds = checked ? [...serviceIds, serviceId] : serviceIds.filter((id) => id !== serviceId);
    setServiceIds(nextIds);
    if (employeeChoice !== "any") {
      const selectedEmployee = catalog.employees.find((employee) => employee.id === employeeChoice);
      if (!selectedEmployee || (selectedEmployee.serviceIds.length && nextIds.some((id) => !selectedEmployee.serviceIds.includes(id)))) setEmployeeChoice("any");
    }
    setSlots([]);
    setChosenSlot(null);
    setSlotError("");
  }

  async function loadSlots() {
    if (!branchId || !serviceIds.length || !date) return;
    setLoadingSlots(true);
    setSlotError("");
    setSlots([]);
    setChosenSlot(null);
    const query = new URLSearchParams({ branchId, employeeId: employeeChoice, date });
    for (const serviceId of serviceIds) query.append("serviceId", serviceId);
    try {
      const response = await fetch(`/api/public/booking/${encodeURIComponent(catalog.company.slug)}/availability?${query}`, { cache: "no-store" });
      const result = await response.json() as { slots?: PublicBookingSlot[]; error?: string };
      if (!response.ok || result.error) setSlotError(result.error ?? "No fue posible consultar los horarios");
      else setSlots(result.slots ?? []);
    } catch {
      setSlotError("No fue posible conectar con el calendario. Inténtalo nuevamente.");
    } finally {
      setLoadingSlots(false);
    }
  }

  if (state.status === "success" && state.confirmation) {
    const confirmation = state.confirmation;
    return (
      <Card className="mx-auto max-w-2xl border-emerald-200 shadow-lg shadow-emerald-950/5">
        <CardHeader className="items-center text-center">
          <span className="mb-2 grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="size-7" /></span>
          <CardTitle className="text-2xl">Reservación recibida</CardTitle>
          <CardDescription>{state.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 rounded-xl bg-muted/60 p-5 sm:grid-cols-2">
            <Summary label="Referencia" value={confirmation.reference} />
            <Summary label="Sucursal" value={confirmation.branchName} />
            <Summary label="Profesional" value={confirmation.employeeName} />
            <Summary label="Fecha y hora" value={`${new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${confirmation.date}T12:00:00Z`))} · ${confirmation.time}`} />
            <Summary label="Servicios" value={confirmation.serviceNames.join(", ")} />
            <Summary label="Duración y total" value={`${confirmation.durationMinutes} min · ${new Intl.NumberFormat("es-MX", { style: "currency", currency: confirmation.currency }).format(confirmation.totalCents / 100)}`} />
          </div>
          <p className="text-center text-sm text-muted-foreground">Guarda tu referencia. La empresa podrá contactarte para confirmar la cita.</p>
        </CardContent>
        <CardFooter className="justify-center"><Button type="button" variant="outline" onClick={() => window.location.reload()}>Reservar otra cita</Button></CardFooter>
      </Card>
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="shadow-lg shadow-stone-950/[0.04]">
        <CardHeader className="border-b">
          <div className="mb-3 flex items-center gap-2" aria-label={`Paso ${step} de 3`}>
            {steps.map((label, index) => { const number = index + 1; return <div key={label} className="flex flex-1 items-center gap-2"><span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold", number <= step ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground")}>{number < step ? <Check className="size-3.5" /> : number}</span><span className={cn("hidden text-xs font-medium sm:block", number === step ? "text-foreground" : "text-muted-foreground")}>{label}</span>{number < steps.length ? <span className="h-px flex-1 bg-border" /> : null}</div>; })}
          </div>
          <CardTitle>{step === 1 ? "Elige una sucursal" : step === 2 ? "Elige tus servicios" : "Selecciona fecha y hora"}</CardTitle>
          <CardDescription>{step === 1 ? "Selecciona dónde deseas recibir el servicio." : step === 2 ? "Puedes combinar varios servicios en la misma cita." : "Mostramos únicamente horarios que siguen disponibles."}</CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          {step === 1 ? <div className="grid gap-3 sm:grid-cols-2">{catalog.branches.map((item) => <button key={item.id} type="button" onClick={() => chooseBranch(item.id)} className="group rounded-xl border bg-background p-5 text-left transition hover:border-violet-300 hover:bg-violet-50/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-violet-300"><span className="grid size-10 place-items-center rounded-lg bg-violet-100 text-violet-700"><Building2 className="size-5" /></span><span className="mt-4 block font-semibold">{item.name}</span><span className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-3.5 shrink-0" />{item.address ?? "Consulta la ubicación con la empresa"}</span></button>)}{!catalog.branches.length ? <p className="col-span-full rounded-xl border border-dashed p-8 text-center text-muted-foreground">No hay sucursales disponibles para reservar.</p> : null}</div> : null}

          {step === 2 ? <div className="space-y-6">{!groupedServices.length ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Esta empresa todavía no ha publicado servicios para reservación en línea.</p> : null}{groupedServices.map(([category, services]) => <fieldset key={category} className="space-y-3"><legend className="text-sm font-semibold">{category}</legend><div className="grid gap-3 sm:grid-cols-2">{services.map((service) => <label key={service.id} className="flex cursor-pointer gap-3 rounded-xl border p-4 transition has-checked:border-violet-400 has-checked:bg-violet-50/60"><input type="checkbox" checked={serviceIds.includes(service.id)} onChange={(event) => toggleService(service.id, event.target.checked)} className="mt-1 size-4 accent-violet-600" /><span className="min-w-0"><span className="block font-medium">{service.name}</span>{service.description ? <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">{service.description}</span> : null}<span className="mt-2 block text-xs font-medium text-violet-700">{service.durationMinutes} min · {money.format(service.priceCents / 100)}</span></span></label>)}</div></fieldset>)}<div className="border-t pt-5"><p className="mb-3 text-sm font-semibold">¿Quién te atenderá?</p><div className="grid gap-2 sm:grid-cols-2"><ChoiceButton selected={employeeChoice === "any"} onClick={() => { setEmployeeChoice("any"); setSlots([]); setChosenSlot(null); }} icon={<UserRound />} title="Primera persona disponible" description="Te asignaremos la primera opción libre." />{eligibleEmployees.map((employee) => <ChoiceButton key={employee.id} selected={employeeChoice === employee.id} onClick={() => { setEmployeeChoice(employee.id); setSlots([]); setChosenSlot(null); }} color={employee.color} icon={<UserRound />} title={employee.name} description="Reservar específicamente con esta persona." />)}</div></div><div className="flex justify-between gap-3 border-t pt-5"><Button type="button" variant="outline" onClick={() => setStep(1)}><ArrowLeft />Sucursal</Button><Button type="button" onClick={() => setStep(3)} disabled={!serviceIds.length || !eligibleEmployees.length} className="bg-violet-600 hover:bg-violet-700">Fecha y hora<ArrowRight /></Button></div></div> : null}

          {step === 3 ? <form action={action} className="space-y-6"><input type="hidden" name="companySlug" value={catalog.company.slug} /><input type="hidden" name="branchId" value={branchId} /><input type="hidden" name="employeeId" value={chosenSlot?.employeeId ?? ""} /><input type="hidden" name="date" value={date} /><input type="hidden" name="time" value={chosenSlot?.time ?? ""} />{serviceIds.map((serviceId) => <input key={serviceId} type="hidden" name="serviceIds" value={serviceId} />)}<div className="absolute -left-[10000px]" aria-hidden="true"><Label htmlFor="bookingWebsite">Sitio web</Label><Input id="bookingWebsite" name="website" tabIndex={-1} autoComplete="off" /></div><div className="grid items-end gap-3 sm:grid-cols-[1fr_auto]"><div className="space-y-2"><Label htmlFor="bookingDate">Fecha</Label><Input id="bookingDate" type="date" value={date} min={minDate} max={maxDate} onChange={(event) => { setDate(event.target.value); setSlots([]); setChosenSlot(null); setSlotError(""); }} required /></div><Button type="button" onClick={loadSlots} disabled={loadingSlots || !date}>{loadingSlots ? <LoaderCircle className="animate-spin" /> : <CalendarClock />}{loadingSlots ? "Consultando…" : "Ver horarios"}</Button></div>{slotError ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{slotError}</p> : null}{!loadingSlots && slots.length ? <fieldset className="space-y-3"><legend className="text-sm font-medium">Horarios disponibles</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{slots.map((slot) => <button key={`${slot.employeeId}-${slot.time}`} type="button" onClick={() => setChosenSlot(slot)} className={cn("rounded-lg border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-violet-300", chosenSlot?.employeeId === slot.employeeId && chosenSlot.time === slot.time ? "border-violet-500 bg-violet-600 text-white" : "hover:border-violet-300")}><span className="block text-sm font-semibold">{slot.time}</span><span className={cn("block truncate text-[11px]", chosenSlot?.employeeId === slot.employeeId && chosenSlot.time === slot.time ? "text-violet-100" : "text-muted-foreground")}>{slot.employeeName}</span></button>)}</div></fieldset> : null}{!loadingSlots && !slotError && !slots.length ? <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">Consulta la fecha para ver los horarios disponibles.</p> : null}<fieldset className="space-y-4 border-t pt-5"><legend className="text-sm font-semibold">Tus datos de contacto</legend><div className="space-y-2"><Label htmlFor="bookingName">Nombre completo</Label><Input id="bookingName" name="customerName" minLength={2} maxLength={160} required /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="bookingPhone">Teléfono</Label><Input id="bookingPhone" name="customerPhone" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} minLength={10} maxLength={32} required /></div><div className="space-y-2"><Label htmlFor="bookingPhoneConfirm">Confirma tu teléfono</Label><Input id="bookingPhoneConfirm" name="customerPhoneConfirm" type="tel" value={phoneConfirm} onChange={(event) => setPhoneConfirm(event.target.value)} minLength={10} maxLength={32} aria-invalid={phoneConfirm.length > 0 && !matchingPhones} required /><p className={cn("text-xs", phoneConfirm.length && matchingPhones ? "text-emerald-700" : "text-muted-foreground")}>{phoneConfirm.length ? matchingPhones ? "Los teléfonos coinciden" : "Los teléfonos aún no coinciden" : "Lo usaremos para confirmar tu cita."}</p></div></div><div className="space-y-2"><Label htmlFor="bookingEmail">Correo electrónico (opcional)</Label><Input id="bookingEmail" name="customerEmail" type="email" /></div><div className="space-y-2"><Label htmlFor="bookingNotes">Notas (opcional)</Label><Textarea id="bookingNotes" name="notes" rows={3} maxLength={1000} /></div><label className="flex items-start gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" name="consent" required className="mt-0.5 size-4 accent-violet-600" /><span>Acepto que la empresa use estos datos únicamente para gestionar y confirmar mi cita.</span></label></fieldset>{state.status === "error" ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.message}</p> : null}<div className="flex flex-col-reverse justify-between gap-3 border-t pt-5 sm:flex-row"><Button type="button" variant="outline" onClick={() => setStep(2)}><ArrowLeft />Servicios</Button><Button type="submit" disabled={pending || !chosenSlot || !matchingPhones} className="bg-violet-600 hover:bg-violet-700">{pending ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}{pending ? "Reservando…" : "Confirmar reservación"}</Button></div></form> : null}
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="size-4 text-violet-600" />Tu cita</CardTitle><CardDescription>El resumen se actualizará con tus selecciones.</CardDescription></CardHeader>
        <CardContent className="space-y-4"><Summary icon={<MapPin />} label="Sucursal" value={branch?.name ?? "Por seleccionar"} /><Summary icon={<Scissors />} label="Servicios" value={selectedServices.length ? selectedServices.map((service) => service.name).join(", ") : "Por seleccionar"} /><Summary icon={<Clock3 />} label="Duración" value={durationMinutes ? `${durationMinutes} minutos` : "—"} /><Summary icon={<UserRound />} label="Profesional" value={chosenSlot?.employeeName ?? (employeeChoice === "any" ? "Primera persona disponible" : eligibleEmployees.find((employee) => employee.id === employeeChoice)?.name ?? "Por seleccionar")} />{chosenSlot ? <Summary icon={<CalendarClock />} label="Horario" value={`${date} · ${chosenSlot.time}`} /> : null}<div className="flex items-center justify-between border-t pt-4"><span className="text-sm font-medium">Total estimado</span><span className="text-lg font-semibold">{money.format(totalCents / 100)}</span></div><Badge variant="secondary" className="w-full justify-center">Pago directamente con la empresa</Badge></CardContent>
      </Card>
    </div>
  );
}

function ChoiceButton({ selected, onClick, icon, title, description, color }: { selected: boolean; onClick: () => void; icon: React.ReactNode; title: string; description: string; color?: string }) {
  return <button type="button" onClick={onClick} className={cn("flex items-start gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-violet-300", selected ? "border-violet-400 bg-violet-50" : "hover:border-violet-200")}><span className="grid size-8 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700 [&_svg]:size-4" style={color ? { backgroundColor: `${color}20`, color } : undefined}>{icon}</span><span><span className="block text-sm font-medium">{title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{description}</span></span></button>;
}

function Summary({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div className="flex items-start gap-3">{icon ? <span className="mt-0.5 text-violet-600 [&_svg]:size-4">{icon}</span> : null}<div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-0.5 text-sm font-medium text-pretty">{value}</p></div></div>;
}
