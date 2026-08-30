"use client";

import { useActionState } from "react";
import { KeyRound, Save } from "lucide-react";

import { resetUserPasswordAction, updateUserAccessAction, type AdminActionState } from "@/app/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: AdminActionState = { status: "idle" };

export function UserAccessControls({ appUserId, membershipId, role, status }: { appUserId: string; membershipId: string; role: string; status: string }) {
  const [accessState, accessAction, accessPending] = useActionState(updateUserAccessAction, initialState);
  const [passwordState, passwordAction, passwordPending] = useActionState(resetUserPasswordAction, initialState);
  return <div className="min-w-[300px] space-y-2"><form action={accessAction} className="flex flex-wrap items-center gap-2"><input type="hidden" name="appUserId" value={appUserId} /><input type="hidden" name="membershipId" value={membershipId} /><select name="role" defaultValue={role} aria-label="Rol" className="h-8 rounded-md border border-input bg-white px-2 text-xs"><option value="owner">Propietario</option><option value="admin">Administrador</option><option value="manager">Gerente</option><option value="receptionist">Recepción</option><option value="employee">Empleado</option></select><select name="status" defaultValue={status} aria-label="Estado" className="h-8 rounded-md border border-input bg-white px-2 text-xs"><option value="active">Activo</option><option value="suspended">Suspendido</option></select><Button size="sm" variant="outline" disabled={accessPending}><Save />Guardar</Button></form><form action={passwordAction} className="flex items-center gap-2"><input type="hidden" name="appUserId" value={appUserId} /><Input className="h-8" name="password" type="password" minLength={12} placeholder="Nueva contraseña (12+)" required /><Button size="sm" variant="ghost" disabled={passwordPending}><KeyRound />Restablecer</Button></form>{accessState.status !== "idle" ? <p role="status" className={accessState.status === "success" ? "text-xs text-emerald-700" : "text-xs text-red-700"}>{accessState.message}</p> : null}{passwordState.status !== "idle" ? <p role="status" className={passwordState.status === "success" ? "text-xs text-emerald-700" : "text-xs text-red-700"}>{passwordState.message}</p> : null}</div>;
}
