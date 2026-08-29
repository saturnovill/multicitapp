"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarOff, LoaderCircle } from "lucide-react";

import { createEmployeeExceptionAction, type EmployeeActionState } from "@/app/app/employee-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: EmployeeActionState = { status: "idle" };
function SubmitButton() { const { pending } = useFormStatus(); return <Button type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <CalendarOff />}Agregar bloqueo</Button>; }

export function EmployeeExceptionForm({ companyId, employeeId, branches }: { companyId: string; employeeId: string; branches: { id: string; name: string }[] }) {
  const [state, action] = useActionState(createEmployeeExceptionAction, initialState);
  return <Card><CardHeader><CardTitle>Ausencias y bloqueos</CardTitle><CardDescription>Bloquea un periodo por descanso, ausencia o actividad interna.</CardDescription></CardHeader><CardContent><form action={action} className="space-y-4"><input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="employeeId" value={employeeId} /><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="exceptionBranch">Sucursal</Label><select id="exceptionBranch" name="branchId" required className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></div><div className="space-y-2"><Label htmlFor="exceptionType">Tipo</Label><select id="exceptionType" name="type" defaultValue="absence" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="absence">Ausencia</option><option value="break">Descanso</option><option value="blocked">Bloqueo interno</option></select></div></div><div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label htmlFor="exceptionDate">Fecha</Label><Input id="exceptionDate" name="date" type="date" required /></div><div className="space-y-2"><Label htmlFor="exceptionStart">Desde</Label><Input id="exceptionStart" name="start" type="time" step={900} defaultValue="09:00" required /></div><div className="space-y-2"><Label htmlFor="exceptionEnd">Hasta</Label><Input id="exceptionEnd" name="end" type="time" step={900} defaultValue="10:00" required /></div></div><div className="space-y-2"><Label htmlFor="exceptionReason">Motivo</Label><Input id="exceptionReason" name="reason" maxLength={500} placeholder="Vacaciones, comida, capacitación…" /></div>{state.status !== "idle" ? <p role="status" className={state.status === "success" ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"}>{state.message}</p> : null}<SubmitButton /></form></CardContent></Card>;
}
