"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Clock3, LoaderCircle } from "lucide-react";
import { saveBranchScheduleAction, type BranchActionState } from "@/app/app/branch-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
const names = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const initialState: BranchActionState = { status: "idle" };
const time = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
function Submit() { const { pending } = useFormStatus(); return <Button type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Clock3 />}Guardar horario</Button>; }
export function BranchScheduleForm({ companyId, branchId, schedules }: { companyId: string; branchId: string; schedules: { dayOfWeek: number; startMinute: number; endMinute: number }[] }) { const [state, action] = useActionState(saveBranchScheduleAction, initialState); return <Card><CardHeader><CardTitle>Horario general</CardTitle><CardDescription>Se aplicará a empleados que todavía no tengan un horario particular en esta sucursal.</CardDescription></CardHeader><CardContent><form action={action} className="space-y-3"><input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="branchId" value={branchId} />{names.map((name, dayOfWeek) => { const row = schedules.find((schedule) => schedule.dayOfWeek === dayOfWeek); return <div key={name} className="grid grid-cols-[minmax(100px,1fr)_110px_110px] items-center gap-3 rounded-lg border p-3"><label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" name={`enabled-${dayOfWeek}`} defaultChecked={Boolean(row)} className="size-4 accent-violet-600" />{name}</label><Input name={`start-${dayOfWeek}`} type="time" step={900} defaultValue={row ? time(row.startMinute) : "09:00"} aria-label={`Apertura ${name}`} /><Input name={`end-${dayOfWeek}`} type="time" step={900} defaultValue={row ? time(row.endMinute) : "18:00"} aria-label={`Cierre ${name}`} /></div>; })}{state.status !== "idle" ? <p role="status" className={state.status === "success" ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"}>{state.message}</p> : null}<Submit /></form></CardContent></Card>; }
