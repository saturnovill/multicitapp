"use client";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, Save } from "lucide-react";
import { updateCompanyAction, type CompanyActionState } from "@/app/app/company-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
const initialState: CompanyActionState = { status: "idle" };
function Submit() { const { pending } = useFormStatus(); return <Button type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <Save />}Guardar configuración</Button>; }
export function CompanySettingsForm({ company }: { company: { id: string; name: string; timezone: string; currency: string } }) { const [state, action] = useActionState(updateCompanyAction, initialState); return <Card className="max-w-2xl"><CardHeader><CardTitle>Datos generales</CardTitle><CardDescription>Estos valores se usan como predeterminados en sucursales, precios y calendarios.</CardDescription></CardHeader><CardContent><form action={action} className="space-y-4"><input type="hidden" name="companyId" value={company.id} /><div className="space-y-2"><Label htmlFor="companyName">Nombre comercial</Label><Input id="companyName" name="name" defaultValue={company.name} required /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="companyTimezone">Zona horaria</Label><Input id="companyTimezone" name="timezone" defaultValue={company.timezone} required /></div><div className="space-y-2"><Label htmlFor="companyCurrency">Moneda ISO</Label><Input id="companyCurrency" name="currency" defaultValue={company.currency} minLength={3} maxLength={3} required /></div></div>{state.status !== "idle" ? <p role="status" className={state.status === "success" ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"}>{state.message}</p> : null}<Submit /></form></CardContent></Card>; }
