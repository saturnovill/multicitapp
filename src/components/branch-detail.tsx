import Link from "next/link";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { BranchExceptionForm } from "@/components/branch-exception-form";
import { BranchForm } from "@/components/branch-form";
import { BranchScheduleForm } from "@/components/branch-schedule-form";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { branches, companies, scheduleExceptions, weeklySchedules } from "@/db/schema";

export async function BranchDetail({ branchId, companyId, backHref, canManage }: { branchId: string; companyId?: string; backHref: string; canManage: boolean }) {
  const db = getDb();
  const [branch] = await db.select({ id: branches.id, companyId: branches.companyId, name: branches.name, timezone: branches.timezone, address: branches.address, phone: branches.phone, email: branches.email, status: branches.status, companyName: companies.name, companyTimezone: companies.timezone }).from(branches).innerJoin(companies, eq(companies.id, branches.companyId)).where(companyId ? and(eq(branches.id, branchId), eq(branches.companyId, companyId)) : eq(branches.id, branchId)).limit(1);
  if (!branch) notFound();
  const [schedules, exceptions] = await Promise.all([
    db.select({ dayOfWeek: weeklySchedules.dayOfWeek, startMinute: weeklySchedules.startMinute, endMinute: weeklySchedules.endMinute }).from(weeklySchedules).where(and(eq(weeklySchedules.companyId, branch.companyId), eq(weeklySchedules.branchId, branch.id), eq(weeklySchedules.scope, "branch"))).orderBy(asc(weeklySchedules.dayOfWeek)),
    db.select({ id: scheduleExceptions.id, type: scheduleExceptions.type, startsAt: scheduleExceptions.startsAt, endsAt: scheduleExceptions.endsAt, reason: scheduleExceptions.reason }).from(scheduleExceptions).where(and(eq(scheduleExceptions.companyId, branch.companyId), eq(scheduleExceptions.branchId, branch.id), isNull(scheduleExceptions.employeeId), inArray(scheduleExceptions.type, ["closed", "special_hours"]))).orderBy(desc(scheduleExceptions.startsAt)).limit(30),
  ]);
  return <div className="p-4 sm:p-6 lg:p-8"><header className="mb-7"><Button variant="ghost" size="sm" asChild className="-ml-3"><Link href={backHref}><ArrowLeft />Volver</Link></Button><h1 className="mt-3 text-3xl font-semibold tracking-tight">{branch.name}</h1><p className="mt-2 text-sm text-muted-foreground">{branch.companyName} · Configuración operativa de la sucursal.</p></header>{canManage ? <div className="grid items-start gap-6 2xl:grid-cols-2"><BranchForm companies={[]} fixedCompanyId={branch.companyId} defaultTimezone={branch.companyTimezone} branch={branch} /><BranchScheduleForm companyId={branch.companyId} branchId={branch.id} schedules={schedules} /><BranchExceptionForm companyId={branch.companyId} branchId={branch.id} timezone={branch.timezone ?? branch.companyTimezone} exceptions={exceptions} /></div> : <p className="rounded-xl border bg-white p-6 text-sm text-muted-foreground">No tienes permisos para modificar esta sucursal.</p>}</div>;
}
