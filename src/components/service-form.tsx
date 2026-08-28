"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { BriefcaseBusiness, LoaderCircle } from "lucide-react";

import { createServiceAction, type ServiceActionState } from "@/app/app/service-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ServiceActionState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700" disabled={pending}>
      {pending ? <LoaderCircle className="animate-spin" /> : null}
      Crear servicio
    </Button>
  );
}

export function ServiceForm({
  companies,
  fixedCompanyId,
}: {
  companies: Array<{ id: string; name: string }>;
  fixedCompanyId?: string;
}) {
  const [state, action] = useActionState(createServiceAction, initialState);

  return (
    <Card>
      <CardHeader>
        <span className="mb-2 grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-700"><BriefcaseBusiness className="size-4" /></span>
        <CardTitle>Nuevo servicio</CardTitle>
        <CardDescription>Define el precio y la duración que ocupará en el calendario.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {fixedCompanyId ? (
            <input type="hidden" name="companyId" value={fixedCompanyId} />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="serviceCompany">Empresa</Label>
              <select id="serviceCompany" name="companyId" required defaultValue="" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
                <option value="" disabled>Seleccionar</option>
                {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="serviceCode">Código</Label><Input id="serviceCode" name="code" placeholder="CONS-01" required maxLength={48} /></div>
            <div className="space-y-2"><Label htmlFor="serviceDuration">Duración (min)</Label><Input id="serviceDuration" name="durationMinutes" type="number" min={5} max={720} step={5} defaultValue={60} required /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="serviceName">Nombre</Label><Input id="serviceName" name="name" required minLength={2} maxLength={160} /></div>
          <div className="space-y-2"><Label htmlFor="servicePrice">Precio</Label><Input id="servicePrice" name="price" type="number" min={0} step="0.01" defaultValue="0.00" required /></div>
          {state.status !== "idle" ? (
            <p role="status" className={state.status === "success" ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"}>{state.message}</p>
          ) : null}
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
