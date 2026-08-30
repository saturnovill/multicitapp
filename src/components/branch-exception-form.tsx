"use client";

import { useActionState, useState } from "react";
import { CalendarOff, Trash2 } from "lucide-react";

import { createBranchExceptionAction, deleteBranchExceptionAction, type BranchActionState } from "@/app/app/branch-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: BranchActionState = { status: "idle" };

export function BranchExceptionForm({ companyId, branchId, exceptions, timezone }: { companyId: string; branchId: string; timezone: string; exceptions: { id: string; type: "closed" | "special_hours" | "absence" | "break" | "blocked"; startsAt: Date; endsAt: Date; reason: string | null }[] }) {
  const [type, setType] = useState<"closed" | "special_hours">("closed");
  const [state, action, pending] = useActionState(createBranchExceptionAction, initialState);
  return <Card><CardHeader><CardTitle>Cierres y horarios especiales</CardTitle><CardDescription>Configura días cerrados o una ventana de atención distinta al horario semanal.</CardDescription></CardHeader><CardContent className="space-y-5"><form action={action} className="space-y-4"><input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="branchId" value={branchId} /><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="branchExceptionType">Tipo</Label><select id="branchExceptionType" name="type" value={type} onChange={(event) => setType(event.target.value as typeof type)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="closed">Cierre de todo el día</option><option value="special_hours">Horario especial</option></select></div><div className="space-y-2"><Label htmlFor="branchExceptionDate">Fecha</Label><Input id="branchExceptionDate" name="date" type="date" required /></div></div>{type === "special_hours" ? <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="branchExceptionStart">Desde</Label><Input id="branchExceptionStart" name="start" type="time" defaultValue="09:00" required /></div><div className="space-y-2"><Label htmlFor="branchExceptionEnd">Hasta</Label><Input id="branchExceptionEnd" name="end" type="time" defaultValue="14:00" required /></div></div> : <><input type="hidden" name="start" value="00:00" /><input type="hidden" name="end" value="23:59" /></>}<div className="space-y-2"><Label htmlFor="branchExceptionReason">Motivo</Label><Input id="branchExceptionReason" name="reason" maxLength={500} placeholder="Día festivo, mantenimiento…" /></div>{state.status !== "idle" ? <p role="status" className={state.status === "success" ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}<Button disabled={pending}><CalendarOff />{pending ? "Guardando…" : "Agregar excepción"}</Button></form><div className="space-y-2 border-t pt-4">{exceptions.map((exception) => <div key={exception.id} className="flex items-center gap-3 rounded-lg border p-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium">{exception.type === "closed" ? "Cerrado" : "Horario especial"} · {new Intl.DateTimeFormat("es-MX", { timeZone: timezone, dateStyle: "medium" }).format(exception.startsAt)}</p><p className="text-xs text-muted-foreground">{exception.type === "special_hours" ? `${new Intl.DateTimeFormat("es-MX", { timeZone: timezone, timeStyle: "short" }).format(exception.startsAt)}–${new Intl.DateTimeFormat("es-MX", { timeZone: timezone, timeStyle: "short" }).format(exception.endsAt)}` : "Todo el día"}{exception.reason ? ` · ${exception.reason}` : ""}</p></div><DeleteBranchException companyId={companyId} branchId={branchId} exceptionId={exception.id} /></div>)}{!exceptions.length ? <p className="text-sm text-muted-foreground">No hay excepciones registradas.</p> : null}</div></CardContent></Card>;
}

function DeleteBranchException({ companyId, branchId, exceptionId }: { companyId: string; branchId: string; exceptionId: string }) {
  const [, action, pending] = useActionState(deleteBranchExceptionAction, initialState);
  return <form action={action}><input type="hidden" name="companyId" value={companyId} /><input type="hidden" name="branchId" value={branchId} /><input type="hidden" name="exceptionId" value={exceptionId} /><Button type="submit" variant="ghost" size="icon-sm" disabled={pending} aria-label="Eliminar excepción"><Trash2 /></Button></form>;
}
