import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { ChevronRight } from "lucide-react";

import { EmployeeForm } from "@/components/employee-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db";
import { branches, companies, employeeBranches, employeeServices, employees, services } from "@/db/schema";

export async function EmployeeDirectory({ companyId, detailBasePath, canManage, showCompany }: { companyId?: string; detailBasePath: string; canManage: boolean; showCompany: boolean }) {
  const db = getDb();
  const scope = companyId ? eq(employees.companyId, companyId) : undefined;
  const [employeeRows, companyRows, branchRows, serviceRows, branchAssignments, serviceAssignments] = await Promise.all([
    db.select({ id: employees.id, companyId: employees.companyId, name: employees.name, email: employees.email, phone: employees.phone, color: employees.color, status: employees.status, companyName: companies.name }).from(employees).innerJoin(companies, eq(companies.id, employees.companyId)).where(scope).orderBy(asc(companies.name), asc(employees.name)),
    companyId ? Promise.resolve([]) : db.select({ id: companies.id, name: companies.name }).from(companies).where(eq(companies.status, "active")).orderBy(asc(companies.name)),
    db.select({ id: branches.id, companyId: branches.companyId, name: branches.name }).from(branches).where(companyId ? and(eq(branches.companyId, companyId), eq(branches.status, "active")) : eq(branches.status, "active")).orderBy(asc(branches.name)),
    db.select({ id: services.id, companyId: services.companyId, name: services.name }).from(services).where(companyId ? and(eq(services.companyId, companyId), eq(services.status, "active")) : eq(services.status, "active")).orderBy(asc(services.name)),
    db.select({ employeeId: employeeBranches.employeeId, branchName: branches.name }).from(employeeBranches).innerJoin(branches, and(eq(branches.id, employeeBranches.branchId), eq(branches.companyId, employeeBranches.companyId))).where(companyId ? eq(employeeBranches.companyId, companyId) : undefined),
    db.select({ employeeId: employeeServices.employeeId }).from(employeeServices).where(companyId ? eq(employeeServices.companyId, companyId) : undefined),
  ]);
  const branchNames = new Map<string, string[]>();
  for (const assignment of branchAssignments) branchNames.set(assignment.employeeId, [...(branchNames.get(assignment.employeeId) ?? []), assignment.branchName]);
  const serviceCounts = new Map<string, number>();
  for (const assignment of serviceAssignments) serviceCounts.set(assignment.employeeId, (serviceCounts.get(assignment.employeeId) ?? 0) + 1);

  return <div className={canManage ? "grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]" : undefined}><Card><CardContent className="p-0"><Table><TableHeader><TableRow><TableHead>Empleado</TableHead>{showCompany ? <TableHead>Empresa</TableHead> : null}<TableHead>Sucursales</TableHead><TableHead>Servicios</TableHead><TableHead>Estado</TableHead><TableHead className="w-16" /></TableRow></TableHeader><TableBody>{employeeRows.map((employee) => <TableRow key={employee.id}><TableCell><div className="flex items-center gap-3"><span className="size-3 rounded-full" style={{ backgroundColor: employee.color }} /><div><p className="font-medium">{employee.name}</p><p className="text-xs text-muted-foreground">{employee.email ?? employee.phone ?? "Sin contacto"}</p></div></div></TableCell>{showCompany ? <TableCell>{employee.companyName}</TableCell> : null}<TableCell className="max-w-64 text-sm">{branchNames.get(employee.id)?.join(", ") ?? "Sin sucursal"}</TableCell><TableCell>{serviceCounts.get(employee.id) ?? 0}</TableCell><TableCell><Badge variant={employee.status === "active" ? "secondary" : "outline"}>{employee.status === "active" ? "Activo" : "Inactivo"}</Badge></TableCell><TableCell><Button variant="ghost" size="icon-sm" asChild><Link href={`${detailBasePath}/${employee.id}`} aria-label={`Administrar a ${employee.name}`}><ChevronRight /></Link></Button></TableCell></TableRow>)}{!employeeRows.length ? <TableRow><TableCell colSpan={showCompany ? 6 : 5} className="h-28 text-center text-muted-foreground">Aún no hay empleados.</TableCell></TableRow> : null}</TableBody></Table></CardContent></Card>{canManage ? <EmployeeForm companies={companyRows} branches={branchRows} services={serviceRows} fixedCompanyId={companyId} /> : null}</div>;
}
