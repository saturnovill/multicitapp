"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, UserRoundPlus } from "lucide-react";

import { saveCustomerAction, type CustomerActionState } from "@/app/app/customer-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: CustomerActionState = { status: "idle" };
function SubmitButton({ editing }: { editing: boolean }) { const { pending } = useFormStatus(); return <Button type="submit" disabled={pending} className="w-full bg-violet-600 hover:bg-violet-700">{pending ? <LoaderCircle className="animate-spin" /> : <UserRoundPlus />}{editing ? "Guardar cambios" : "Crear cliente"}</Button>; }

export function CustomerForm({ companies, fixedCompanyId, customer }: { companies: { id: string; name: string }[]; fixedCompanyId?: string; customer?: { id: string; companyId: string; name: string; phone: string | null; email: string | null; notes: string | null } }) {
  const [state, action] = useActionState(saveCustomerAction, initialState);
  return <Card><CardHeader><CardTitle>{customer ? "Datos del cliente" : "Nuevo cliente"}</CardTitle><CardDescription>Información de contacto y notas internas.</CardDescription></CardHeader><CardContent><form action={action} className="space-y-4"><input type="hidden" name="customerId" value={customer?.id ?? ""} />{fixedCompanyId ? <input type="hidden" name="companyId" value={fixedCompanyId} /> : <div className="space-y-2"><Label htmlFor="customerCompany">Empresa</Label><select id="customerCompany" name="companyId" required defaultValue={customer?.companyId ?? ""} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="" disabled>Seleccionar empresa</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></div>}<div className="space-y-2"><Label htmlFor="customerName">Nombre</Label><Input id="customerName" name="name" defaultValue={customer?.name} required maxLength={160} /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="customerPhone">Teléfono</Label><Input id="customerPhone" name="phone" type="tel" defaultValue={customer?.phone ?? ""} maxLength={32} /></div><div className="space-y-2"><Label htmlFor="customerEmail">Correo</Label><Input id="customerEmail" name="email" type="email" defaultValue={customer?.email ?? ""} /></div></div><div className="space-y-2"><Label htmlFor="customerNotes">Notas</Label><Textarea id="customerNotes" name="notes" defaultValue={customer?.notes ?? ""} rows={4} maxLength={2000} /></div>{state.status !== "idle" ? <p role="status" className={state.status === "success" ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"}>{state.message}</p> : null}<SubmitButton editing={Boolean(customer)} /></form></CardContent></Card>;
}
