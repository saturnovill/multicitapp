"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, UserRoundPlus } from "lucide-react";

import { saveEmployeeAction, type EmployeeActionState } from "@/app/app/employee-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CompanyOption = { id: string; name: string };
type BranchOption = { id: string; companyId: string; name: string };
type ServiceOption = { id: string; companyId: string; name: string };
type EmployeeValue = { id: string; companyId: string; name: string; email: string | null; phone: string | null; color: string; status: "active" | "inactive"; branchIds: string[]; serviceIds: string[] };
const initialState: EmployeeActionState = { status: "idle" };

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <UserRoundPlus />}{editing ? "Guardar cambios" : "Crear empleado"}</Button>;
}

export function EmployeeForm({ companies, branches, services, fixedCompanyId, employee }: { companies: CompanyOption[]; branches: BranchOption[]; services: ServiceOption[]; fixedCompanyId?: string; employee?: EmployeeValue }) {
  const [state, action] = useActionState(saveEmployeeAction, initialState);
  const [companyId, setCompanyId] = useState(employee?.companyId ?? fixedCompanyId ?? companies[0]?.id ?? "");
  const [branchIds, setBranchIds] = useState(employee?.branchIds ?? []);
  const [serviceIds, setServiceIds] = useState(employee?.serviceIds ?? []);
  const companyBranches = useMemo(() => branches.filter((branch) => branch.companyId === companyId), [branches, companyId]);
  const companyServices = useMemo(() => services.filter((service) => service.companyId === companyId), [services, companyId]);

  return (
    <Card><CardHeader><CardTitle>{employee ? "Perfil del empleado" : "Nuevo empleado"}</CardTitle><CardDescription>Asigna sus sucursales y los servicios que puede realizar.</CardDescription></CardHeader><CardContent>
      <form action={action} className="space-y-5">
        <input type="hidden" name="employeeId" value={employee?.id ?? ""} />
        {fixedCompanyId ? <input type="hidden" name="companyId" value={fixedCompanyId} /> : <div className="space-y-2"><Label htmlFor="employeeCompany">Empresa</Label><select id="employeeCompany" name="companyId" required value={companyId} onChange={(event) => { setCompanyId(event.target.value); setBranchIds([]); setServiceIds([]); }} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="" disabled>Seleccionar empresa</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></div>}
        <div className="space-y-2"><Label htmlFor="employeeName">Nombre</Label><Input id="employeeName" name="name" defaultValue={employee?.name} required maxLength={160} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="employeeEmail">Correo</Label><Input id="employeeEmail" name="email" type="email" defaultValue={employee?.email ?? ""} /></div><div className="space-y-2"><Label htmlFor="employeePhone">Teléfono</Label><Input id="employeePhone" name="phone" type="tel" defaultValue={employee?.phone ?? ""} maxLength={32} /></div></div>
        <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="employeeColor">Color en agenda</Label><Input id="employeeColor" name="color" type="color" defaultValue={employee?.color ?? "#7c3aed"} className="p-1" /></div><div className="space-y-2"><Label htmlFor="employeeStatus">Estado</Label><select id="employeeStatus" name="status" defaultValue={employee?.status ?? "active"} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="active">Activo</option><option value="inactive">Inactivo</option></select></div></div>
        <fieldset className="space-y-2"><legend className="text-sm font-medium">Sucursales</legend><div className="grid gap-2 sm:grid-cols-2">{companyBranches.map((branch) => <label key={branch.id} className="flex items-center gap-2 rounded-lg border p-3 text-sm has-checked:border-violet-300 has-checked:bg-violet-50"><input type="checkbox" name="branchIds" value={branch.id} checked={branchIds.includes(branch.id)} onChange={(event) => setBranchIds((current) => event.target.checked ? [...current, branch.id] : current.filter((id) => id !== branch.id))} className="size-4 accent-violet-600" />{branch.name}</label>)}</div>{!companyBranches.length ? <p className="text-sm text-muted-foreground">La empresa no tiene sucursales activas.</p> : null}</fieldset>
        <fieldset className="space-y-2"><legend className="text-sm font-medium">Servicios</legend><div className="grid gap-2 sm:grid-cols-2">{companyServices.map((service) => <label key={service.id} className="flex items-center gap-2 rounded-lg border p-3 text-sm has-checked:border-violet-300 has-checked:bg-violet-50"><input type="checkbox" name="serviceIds" value={service.id} checked={serviceIds.includes(service.id)} onChange={(event) => setServiceIds((current) => event.target.checked ? [...current, service.id] : current.filter((id) => id !== service.id))} className="size-4 accent-violet-600" />{service.name}</label>)}</div>{!companyServices.length ? <p className="text-sm text-muted-foreground">Aún no hay servicios activos.</p> : null}</fieldset>
        {state.status !== "idle" ? <p role="status" className={state.status === "success" ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"}>{state.message}</p> : null}
        <SubmitButton editing={Boolean(employee)} />
      </form>
    </CardContent></Card>
  );
}
