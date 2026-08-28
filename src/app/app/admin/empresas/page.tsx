import type { Metadata } from "next";
import Link from "next/link";
import { asc, count } from "drizzle-orm";
import { ArrowUpRight } from "lucide-react";

import { AdminPageHeader } from "@/components/admin-page-header";
import { CompanyForm } from "@/components/admin-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db";
import { branches, companies, companyMemberships, employees } from "@/db/schema";

export const metadata: Metadata = { title: "Empresas | Superadministración" };

export default async function CompaniesPage() {
  const db = getDb();
  const [companyRows, branchCounts, userCounts, employeeCounts] = await Promise.all([
    db.select().from(companies).orderBy(asc(companies.name)),
    db.select({ companyId: branches.companyId, value: count() }).from(branches).groupBy(branches.companyId),
    db.select({ companyId: companyMemberships.companyId, value: count() }).from(companyMemberships).groupBy(companyMemberships.companyId),
    db.select({ companyId: employees.companyId, value: count() }).from(employees).groupBy(employees.companyId),
  ]);
  const branchesByCompany = new Map(branchCounts.map((row) => [row.companyId, row.value]));
  const usersByCompany = new Map(userCounts.map((row) => [row.companyId, row.value]));
  const employeesByCompany = new Map(employeeCounts.map((row) => [row.companyId, row.value]));

  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
      <AdminPageHeader eyebrow="Directorio global" title="Empresas" description="Registra organizaciones y consulta toda su estructura, personal, servicios y actividad." />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Empresa</TableHead><TableHead>Sucursales</TableHead><TableHead>Usuarios</TableHead><TableHead>Empleados</TableHead><TableHead>Estado</TableHead><TableHead className="w-16"><span className="sr-only">Abrir</span></TableHead></TableRow></TableHeader>
              <TableBody>
                {companyRows.length ? companyRows.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell><p className="font-medium">{company.name}</p><p className="text-xs text-muted-foreground">{company.slug}</p></TableCell>
                    <TableCell>{branchesByCompany.get(company.id) ?? 0}</TableCell>
                    <TableCell>{usersByCompany.get(company.id) ?? 0}</TableCell>
                    <TableCell>{employeesByCompany.get(company.id) ?? 0}</TableCell>
                    <TableCell><Badge variant="secondary">{company.status === "active" ? "Activa" : company.status}</Badge></TableCell>
                    <TableCell><Button asChild variant="ghost" size="icon" aria-label={`Abrir ${company.name}`}><Link href={`/app/admin/empresas/${company.id}`}><ArrowUpRight /></Link></Button></TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={6} className="h-28 text-center text-muted-foreground">Aún no hay empresas.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <CompanyForm />
      </div>
    </main>
  );
}
