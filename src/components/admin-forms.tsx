"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Building2, KeyRound, LoaderCircle, UserPlus } from "lucide-react";

import {
  changeAdminPasswordAction,
  createCompanyAction,
  createUserAction,
  type AdminActionState,
} from "@/app/app/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CompanyOption = { id: string; name: string };

const initialState: AdminActionState = { status: "idle" };

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      className="w-full bg-violet-600 hover:bg-violet-700"
      disabled={pending}
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}

function ActionMessage({ state }: { state: AdminActionState }) {
  if (state.status === "idle") return null;
  return (
    <p
      role="status"
      className={
        state.status === "success"
          ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      }
    >
      {state.message}
    </p>
  );
}

export function CompanyForm() {
  const [companyState, companyAction] = useActionState(
    createCompanyAction,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <span className="mb-2 grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-700">
          <Building2 className="size-4" />
        </span>
        <CardTitle>Nueva empresa</CardTitle>
        <CardDescription>Crea la organización y su primera sucursal.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={companyAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Empresa</Label>
            <Input id="companyName" name="companyName" required minLength={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="branchName">Sucursal principal</Label>
            <Input id="branchName" name="branchName" required minLength={2} />
          </div>
          <input type="hidden" name="timezone" value="America/Hermosillo" />
          <ActionMessage state={companyState} />
          <SubmitButton>Crear empresa</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

export function UserForm({ companies }: { companies: CompanyOption[] }) {
  const [userState, userAction] = useActionState(createUserAction, initialState);

  return (
    <Card>
      <CardHeader>
        <span className="mb-2 grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-700">
          <UserPlus className="size-4" />
        </span>
        <CardTitle>Nuevo usuario</CardTitle>
        <CardDescription>Crea sus credenciales y asígnalo a una empresa.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={userAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userName">Nombre</Label>
            <Input id="userName" name="name" required minLength={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="userEmail">Correo</Label>
            <Input id="userEmail" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="userPassword">Contraseña inicial</Label>
            <Input id="userPassword" name="password" type="password" autoComplete="new-password" minLength={12} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyId">Empresa</Label>
              <select id="companyId" name="companyId" required defaultValue="" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
                <option value="" disabled>Seleccionar</option>
                {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <select id="role" name="role" required defaultValue="employee" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50">
                <option value="owner">Propietario</option>
                <option value="admin">Administrador</option>
                <option value="manager">Gerente</option>
                <option value="receptionist">Recepción</option>
                <option value="employee">Empleado</option>
              </select>
            </div>
          </div>
          <ActionMessage state={userState} />
          <SubmitButton>Crear usuario</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

export function PasswordForm() {
  const [passwordState, passwordAction] = useActionState(
    changeAdminPasswordAction,
    initialState,
  );

  return (
    <Card>
        <CardHeader>
          <span className="mb-2 grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-700">
            <KeyRound className="size-4" />
          </span>
          <CardTitle>Mi contraseña</CardTitle>
          <CardDescription>
            Sustituye la contraseña temporal del superadministrador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={passwordAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminPassword">Nueva contraseña</Label>
              <Input
                id="adminPassword"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminConfirmation">Confirmar contraseña</Label>
              <Input
                id="adminConfirmation"
                name="confirmation"
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
              />
            </div>
            <ActionMessage state={passwordState} />
            <SubmitButton>Actualizar contraseña</SubmitButton>
          </form>
        </CardContent>
    </Card>
  );
}

export function AdminForms({ companies }: { companies: CompanyOption[] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <CompanyForm />
      <UserForm companies={companies} />
      <PasswordForm />
    </div>
  );
}
