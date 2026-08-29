"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Clock3, LoaderCircle } from "lucide-react";

import { saveEmployeeScheduleAction, type EmployeeActionState } from "@/app/app/employee-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const initialState: EmployeeActionState = { status: "idle" };

function SubmitButton() { const { pending } = useFormStatus(); return <Button type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Clock3 />}Guardar horario</Button>; }
const minuteToTime = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

export function EmployeeScheduleForm({ companyId, employeeId, branches, schedules }: { companyId: string; employeeId: string; branches: { id: string; name: string }[]; schedules: { branchId: string; dayOfWeek: number; startMinute: number; endMinute: number }[] }) {
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [state, action] = useActionState(saveEmployeeScheduleAction, initialState);
  const branchSchedules = schedules.filter((schedule) => schedule.branchId === branchId);

  return <Card><CardHeader><CardTitle>Horario semanal</CardTitle><CardDescription>La agenda solo permitirá citas dentro de estos periodos. Un día desmarcado se considera descanso.</CardDescription></CardHeader><CardContent className="space-y-5"><div className="space-y-2"><Label htmlFor="scheduleBranch">Sucursal</Label><select id="scheduleBranch" value={branchId} onChange={(event) => setBranchId(event.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></div>{branchId ? <form key={branchId} action={action} className="space-y-3"><input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="employeeId" value={employeeId} /><input type="hidden" name="branchId" value={branchId} />{dayNames.map((name, dayOfWeek) => { const schedule = branchSchedules.find((row) => row.dayOfWeek === dayOfWeek); return <div key={name} className="grid grid-cols-[minmax(100px,1fr)_110px_110px] items-center gap-3 rounded-lg border p-3"><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name={`enabled-${dayOfWeek}`} defaultChecked={Boolean(schedule)} className="size-4 accent-violet-600" />{name}</label><Input name={`start-${dayOfWeek}`} type="time" step={900} defaultValue={schedule ? minuteToTime(schedule.startMinute) : "09:00"} aria-label={`Entrada ${name}`} /><Input name={`end-${dayOfWeek}`} type="time" step={900} defaultValue={schedule ? minuteToTime(schedule.endMinute) : "18:00"} aria-label={`Salida ${name}`} /></div>; })}{state.status !== "idle" ? <p role="status" className={state.status === "success" ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"}>{state.message}</p> : null}<SubmitButton /></form> : <p className="text-sm text-muted-foreground">Asigna al empleado al menos a una sucursal.</p>}</CardContent></Card>;
}
