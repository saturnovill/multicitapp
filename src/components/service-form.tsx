"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { BriefcaseBusiness, LoaderCircle } from "lucide-react";

import { saveServiceAction, type ServiceActionState } from "@/app/app/service-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ServiceActionState = { status: "idle" };

type ServiceFormProps = {
  companies: { id: string; name: string }[];
  categories: { id: string; companyId: string; name: string }[];
  branches: { id: string; companyId: string; name: string }[];
  fixedCompanyId?: string;
  service?: {
    id: string;
    companyId: string;
    categoryId: string | null;
    code: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    preparationMinutes: number;
    cleanupMinutes: number;
    priceCents: number;
    taxBasisPoints: number;
    status: "active" | "inactive";
    isPublic: boolean;
    branchAssignments: { branchId: string; priceOverrideCents: number | null }[];
  };
};

function Submit({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <BriefcaseBusiness />}{editing ? "Guardar cambios" : "Crear servicio"}</Button>;
}

export function ServiceForm({ companies, categories, branches, fixedCompanyId, service }: ServiceFormProps) {
  const [state, action] = useActionState(saveServiceAction, initialState);
  const [companyId, setCompanyId] = useState(service?.companyId ?? fixedCompanyId ?? "");
  const availableCategories = categories.filter((category) => category.companyId === companyId);
  const availableBranches = branches.filter((branch) => branch.companyId === companyId);
  const initialBranchIds = service?.branchAssignments.map((row) => row.branchId) ?? (fixedCompanyId ? availableBranches.map((row) => row.id) : []);
  const [selectedBranches, setSelectedBranches] = useState(initialBranchIds);
  const overrideByBranch = new Map(service?.branchAssignments.map((row) => [row.branchId, row.priceOverrideCents]) ?? []);

  function changeCompany(nextCompanyId: string) {
    setCompanyId(nextCompanyId);
    setSelectedBranches(branches.filter((branch) => branch.companyId === nextCompanyId).map((branch) => branch.id));
  }

  return <Card><CardHeader><CardTitle>{service ? "Editar servicio" : "Nuevo servicio"}</CardTitle><CardDescription>Precio, duración, impuestos, disponibilidad y categoría.</CardDescription></CardHeader><CardContent><form action={action} className="space-y-4"><input type="hidden" name="serviceId" value={service?.id ?? ""} />{fixedCompanyId ? <input type="hidden" name="companyId" value={fixedCompanyId} /> : <div className="space-y-2"><Label htmlFor="serviceCompany">Empresa</Label><select id="serviceCompany" name="companyId" value={companyId} onChange={(event) => changeCompany(event.target.value)} required className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="" disabled>Seleccionar</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></div>}
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="serviceCode">Código</Label><Input id="serviceCode" name="code" defaultValue={service?.code} required maxLength={48} /></div><div className="space-y-2"><Label htmlFor="serviceCategory">Categoría</Label><select id="serviceCategory" name="categoryId" defaultValue={service?.categoryId ?? ""} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="">Sin categoría</option>{availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div></div>
    <div className="space-y-2"><Label htmlFor="serviceName">Nombre</Label><Input id="serviceName" name="name" defaultValue={service?.name} required maxLength={160} /></div>
    <div className="space-y-2"><Label htmlFor="serviceDescription">Descripción</Label><Textarea id="serviceDescription" name="description" defaultValue={service?.description ?? ""} rows={3} maxLength={2000} /></div>
    <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label htmlFor="serviceDuration">Servicio (min)</Label><Input id="serviceDuration" name="durationMinutes" type="number" min={5} max={720} step={5} defaultValue={service?.durationMinutes ?? 60} required /></div><div className="space-y-2"><Label htmlFor="servicePreparation">Preparación</Label><Input id="servicePreparation" name="preparationMinutes" type="number" min={0} max={240} step={5} defaultValue={service?.preparationMinutes ?? 0} required /></div><div className="space-y-2"><Label htmlFor="serviceCleanup">Limpieza</Label><Input id="serviceCleanup" name="cleanupMinutes" type="number" min={0} max={240} step={5} defaultValue={service?.cleanupMinutes ?? 0} required /></div></div>
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="servicePrice">Precio base</Label><Input id="servicePrice" name="price" type="number" min={0} step="0.01" defaultValue={service ? (service.priceCents / 100).toFixed(2) : "0.00"} required /></div><div className="space-y-2"><Label htmlFor="serviceTax">Impuesto (%)</Label><Input id="serviceTax" name="taxPercent" type="number" min={0} max={100} step="0.01" defaultValue={service ? service.taxBasisPoints / 100 : 0} required /></div></div>
    <fieldset className="space-y-2 rounded-lg border p-3"><legend className="px-1 text-sm font-medium">Sucursales disponibles</legend>{availableBranches.map((branch) => { const checked = selectedBranches.includes(branch.id); const override = overrideByBranch.get(branch.id); return <div key={branch.id} className="grid grid-cols-[1fr_140px] items-center gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="branchIds" value={branch.id} checked={checked} onChange={(event) => setSelectedBranches((current) => event.target.checked ? [...current, branch.id] : current.filter((id) => id !== branch.id))} className="size-4 accent-violet-600" />{branch.name}</label><Input name={`branchPrice-${branch.id}`} type="number" min={0} step="0.01" disabled={!checked} defaultValue={override == null ? "" : (override / 100).toFixed(2)} placeholder="Precio opcional" aria-label={`Precio en ${branch.name}`} /></div>; })}{companyId && !availableBranches.length ? <p className="text-sm text-destructive">La empresa necesita una sucursal activa.</p> : null}</fieldset>
    <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="serviceStatus">Estado</Label><select id="serviceStatus" name="status" defaultValue={service?.status ?? "active"} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="active">Activo</option><option value="inactive">Inactivo</option></select></div><label className="mt-7 flex items-center gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" name="isPublic" defaultChecked={service?.isPublic ?? true} className="size-4 accent-violet-600" />Disponible para reserva pública</label></div>
    {state.status !== "idle" ? <p role="status" className={state.status === "success" ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"}>{state.message}</p> : null}<Submit editing={Boolean(service)} /></form></CardContent></Card>;
}
