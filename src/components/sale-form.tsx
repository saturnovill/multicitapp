"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Minus, Plus, ReceiptText, Trash2 } from "lucide-react";

import { createSaleAction, type SaleActionState } from "@/app/app/sale-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Setup = {
  company: { id: string; name: string; currency: string };
  branches: { id: string; name: string }[];
  customers: { id: string; name: string; phone: string | null }[];
  services: { id: string; code: string; name: string; priceCents: number }[];
  employees: { id: string; name: string; branchId: string }[];
  appointments: { id: string; branchId: string; customerId: string; employeeId: string; startsAt: Date; status: string; customerName: string }[];
  appointmentServices: { appointmentId: string; serviceId: string }[];
};

type Line = { key: string; serviceId: string; employeeId: string; quantity: number };
type Payment = { method: "cash" | "card" | "transfer"; amount: string; reference: string };

const initialState: SaleActionState = { status: "idle" };
const money = (cents: number, currency: string) => new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(cents / 100);

export function SaleForm({ setup, initialAppointmentId = "" }: { setup: Setup; initialAppointmentId?: string }) {
  const initialAppointment = setup.appointments.find((row) => row.id === initialAppointmentId);
  const initialServices = initialAppointment ? setup.appointmentServices.filter((row) => row.appointmentId === initialAppointment.id) : [];
  const [state, action, pending] = useActionState(createSaleAction, initialState);
  const [branchId, setBranchId] = useState(initialAppointment?.branchId ?? setup.branches[0]?.id ?? "");
  const [customerId, setCustomerId] = useState(initialAppointment?.customerId ?? "");
  const [appointmentId, setAppointmentId] = useState(initialAppointment?.id ?? "");
  const [lines, setLines] = useState<Line[]>(() => initialServices.length ? initialServices.map((row) => ({ key: crypto.randomUUID(), serviceId: row.serviceId, employeeId: initialAppointment!.employeeId, quantity: 1 })) : [{ key: crypto.randomUUID(), serviceId: setup.services[0]?.id ?? "", employeeId: "", quantity: 1 }]);
  const [payments, setPayments] = useState<Payment[]>([{ method: "cash", amount: "", reference: "" }]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);

  const employees = setup.employees.filter((employee) => employee.branchId === branchId);
  const subtotal = useMemo(() => lines.reduce((sum, line) => sum + (setup.services.find((service) => service.id === line.serviceId)?.priceCents ?? 0) * line.quantity, 0), [lines, setup.services]);
  const discount = Math.round(subtotal * discountPercent / 100);
  const tax = Math.round((subtotal - discount) * taxPercent / 100);
  const total = subtotal - discount + tax;
  const paid = payments.reduce((sum, payment) => sum + Math.max(0, Math.round(Number(payment.amount || 0) * 100)), 0);

  function selectAppointment(id: string) {
    setAppointmentId(id);
    const appointment = setup.appointments.find((row) => row.id === id);
    if (!appointment) return;
    setBranchId(appointment.branchId);
    setCustomerId(appointment.customerId);
    const serviceRows = setup.appointmentServices.filter((row) => row.appointmentId === appointment.id);
    setLines(serviceRows.map((row) => ({ key: crypto.randomUUID(), serviceId: row.serviceId, employeeId: appointment.employeeId, quantity: 1 })));
  }

  function changeBranch(id: string) {
    setBranchId(id);
    setAppointmentId("");
    setLines((current) => current.map((line) => ({ ...line, employeeId: "" })));
  }

  if (state.status === "success" && state.saleId) {
    const base = state.admin ? "/app/admin/ventas" : "/app/ventas";
    return <Card className="mx-auto max-w-xl"><CardHeader><div className="mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><ReceiptText /></div><CardTitle>Venta registrada</CardTitle><CardDescription>{state.message}</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-3"><Button asChild><Link href={`${base}/${state.saleId}`}>Ver recibo</Link></Button><Button variant="outline" asChild><Link href={`${base}/nueva`}>Registrar otra</Link></Button><Button variant="ghost" asChild><Link href={base}>Volver a ventas</Link></Button></CardContent></Card>;
  }

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <input type="hidden" name="companyId" value={setup.company.id} />
      <input type="hidden" name="items" value={JSON.stringify(lines.map(({ serviceId, employeeId, quantity }) => ({ serviceId, employeeId, quantity })))} />
      <input type="hidden" name="payments" value={JSON.stringify(payments.filter((payment) => Number(payment.amount) > 0).map((payment) => ({ method: payment.method, amountCents: Math.round(Number(payment.amount) * 100), reference: payment.reference })))} />
      <div className="space-y-6">
        <Card><CardHeader><CardTitle>Origen y cliente</CardTitle><CardDescription>Selecciona una cita para cargarla automáticamente o registra una venta directa.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2"><Label htmlFor="branchId">Sucursal</Label><select id="branchId" name="branchId" required value={branchId} onChange={(event) => changeBranch(event.target.value)} className="h-9 w-full rounded-lg border border-input bg-white px-3 text-sm"><option value="">Selecciona</option>{setup.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="appointmentId">Cita (opcional)</Label><select id="appointmentId" name="appointmentId" value={appointmentId} onChange={(event) => selectAppointment(event.target.value)} className="h-9 w-full rounded-lg border border-input bg-white px-3 text-sm"><option value="">Venta directa</option>{setup.appointments.filter((row) => !branchId || row.branchId === branchId).map((row) => <option key={row.id} value={row.id}>{new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" }).format(row.startsAt)} · {row.customerName}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="customerId">Cliente (opcional)</Label><select id="customerId" name="customerId" value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="h-9 w-full rounded-lg border border-input bg-white px-3 text-sm"><option value="">Público general</option>{setup.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}</select></div>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Servicios</CardTitle><CardDescription>Asigna el empleado responsable en cada partida.</CardDescription></CardHeader><CardContent className="space-y-4">
          {lines.map((line, index) => <div key={line.key} className="grid gap-3 rounded-xl border bg-stone-50/60 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_40px]">
            <div className="space-y-2"><Label>Servicio</Label><select required value={line.serviceId} onChange={(event) => setLines((current) => current.map((row) => row.key === line.key ? { ...row, serviceId: event.target.value } : row))} className="h-9 w-full rounded-lg border border-input bg-white px-3 text-sm"><option value="">Selecciona</option>{setup.services.map((service) => <option key={service.id} value={service.id}>{service.name} · {money(service.priceCents, setup.company.currency)}</option>)}</select></div>
            <div className="space-y-2"><Label>Empleado</Label><select required value={line.employeeId} onChange={(event) => setLines((current) => current.map((row) => row.key === line.key ? { ...row, employeeId: event.target.value } : row))} className="h-9 w-full rounded-lg border border-input bg-white px-3 text-sm"><option value="">Selecciona</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></div>
            <div className="space-y-2"><Label>Cantidad</Label><div className="flex items-center"><Button type="button" variant="outline" size="icon" onClick={() => setLines((current) => current.map((row) => row.key === line.key ? { ...row, quantity: Math.max(1, row.quantity - 1) } : row))} aria-label="Restar"><Minus /></Button><span className="w-10 text-center font-medium">{line.quantity}</span><Button type="button" variant="outline" size="icon" onClick={() => setLines((current) => current.map((row) => row.key === line.key ? { ...row, quantity: Math.min(99, row.quantity + 1) } : row))} aria-label="Sumar"><Plus /></Button></div></div>
            <div className="flex items-end"><Button type="button" variant="ghost" size="icon" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))} aria-label={`Eliminar partida ${index + 1}`}><Trash2 /></Button></div>
          </div>)}
          <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, { key: crypto.randomUUID(), serviceId: setup.services[0]?.id ?? "", employeeId: "", quantity: 1 }])}><Plus />Agregar servicio</Button>
        </CardContent></Card>

        <Card><CardHeader><CardTitle>Notas</CardTitle></CardHeader><CardContent><Textarea name="notes" placeholder="Observaciones internas de la venta" maxLength={2000} /></CardContent></Card>
      </div>

      <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <Card><CardHeader><CardTitle>Totales</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="discountPercent">Descuento %</Label><Input id="discountPercent" name="discountPercent" type="number" min="0" max="100" step="0.01" value={discountPercent} onChange={(event) => setDiscountPercent(Number(event.target.value))} /></div><div className="space-y-2"><Label htmlFor="taxPercent">Impuesto %</Label><Input id="taxPercent" name="taxPercent" type="number" min="0" max="100" step="0.01" value={taxPercent} onChange={(event) => setTaxPercent(Number(event.target.value))} /></div></div><div className="space-y-2 border-t pt-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal, setup.company.currency)}</span></div><div className="flex justify-between text-emerald-700"><span>Descuento</span><span>-{money(discount, setup.company.currency)}</span></div><div className="flex justify-between"><span>Impuestos</span><span>{money(tax, setup.company.currency)}</span></div><div className="flex justify-between pt-2 text-lg font-semibold"><span>Total</span><span>{money(total, setup.company.currency)}</span></div></div></CardContent></Card>

        <Card><CardHeader><CardTitle>Pago</CardTitle><CardDescription>Puedes combinar efectivo, tarjeta y transferencia.</CardDescription></CardHeader><CardContent className="space-y-3">{payments.map((payment, index) => <div key={`${payment.method}-${index}`} className="grid grid-cols-[110px_1fr_36px] gap-2"><select value={payment.method} onChange={(event) => setPayments((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, method: event.target.value as Payment["method"] } : row))} className="h-9 rounded-lg border border-input bg-white px-2 text-sm"><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option></select><Input type="number" min="0.01" step="0.01" placeholder="0.00" value={payment.amount} onChange={(event) => setPayments((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, amount: event.target.value } : row))} aria-label={`Importe del pago ${index + 1}`} /><Button type="button" variant="ghost" size="icon" disabled={payments.length === 1} onClick={() => setPayments((current) => current.filter((_, rowIndex) => rowIndex !== index))} aria-label="Eliminar pago"><Trash2 /></Button>{payment.method !== "cash" ? <Input className="col-start-2" placeholder="Referencia (opcional)" value={payment.reference} onChange={(event) => setPayments((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, reference: event.target.value } : row))} /> : null}</div>)}<Button type="button" variant="outline" size="sm" disabled={payments.length >= 3} onClick={() => setPayments((current) => [...current, { method: "card", amount: "", reference: "" }])}><Plus />Combinar pago</Button><div className="border-t pt-3 text-sm"><div className="flex justify-between"><span>Pagado</span><span>{money(paid, setup.company.currency)}</span></div><div className="mt-1 flex justify-between font-medium"><span>Cambio</span><span>{money(Math.max(0, paid - total), setup.company.currency)}</span></div></div></CardContent></Card>
        {state.status === "error" ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{state.message}</p> : null}
        <Button className="w-full" size="lg" disabled={pending || !branchId || lines.some((line) => !line.serviceId || !line.employeeId) || paid < total}>{pending ? "Registrando…" : "Cobrar y generar folio"}</Button>
      </div>
    </form>
  );
}
