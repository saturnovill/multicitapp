import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { Building2, ShieldCheck, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";

import { AdminForms } from "@/components/admin-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDb } from "@/db";
import {
  appUsers,
  companies,
  companyMemberships,
} from "@/db/schema";
import { getCurrentPlatformAdmin } from "@/lib/platform-admin";

export const metadata: Metadata = { title: "Superadministración" };

const roleLabels: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  manager: "Gerente",
  receptionist: "Recepción",
  employee: "Empleado",
};

export default async function AdminPage() {
  const admin = await getCurrentPlatformAdmin();
  if (!admin) redirect("/app");

  const db = getDb();
  const [companyRows, userRows] = await Promise.all([
    db
      .select({
        id: companies.id,
        name: companies.name,
        slug: companies.slug,
        status: companies.status,
        createdAt: companies.createdAt,
      })
      .from(companies)
      .orderBy(asc(companies.name)),
    db
      .select({
        id: appUsers.id,
        name: appUsers.name,
        email: appUsers.email,
        platformRole: appUsers.platformRole,
        active: appUsers.isActive,
        companyName: companies.name,
        membershipRole: companyMemberships.role,
      })
      .from(appUsers)
      .leftJoin(
        companyMemberships,
        eq(companyMemberships.userId, appUsers.id),
      )
      .leftJoin(companies, eq(companies.id, companyMemberships.companyId))
      .orderBy(asc(appUsers.name), asc(companies.name)),
  ]);

  const companyOptions = companyRows.map(({ id, name }) => ({ id, name }));

  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
      <div className="mb-8">
        <p className="text-sm font-medium text-violet-700">Control de plataforma</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Empresas y accesos
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Solo el superadministrador puede crear empresas, credenciales y
          asignaciones de acceso.
        </p>
      </div>

      <section className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700">
              <Building2 className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold">{companyRows.length}</p>
              <p className="text-xs text-muted-foreground">Empresas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <UsersRound className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold">{userRows.length}</p>
              <p className="text-xs text-muted-foreground">Usuarios</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-semibold">Cerrado</p>
              <p className="text-xs text-muted-foreground">Registro público</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <AdminForms companies={companyOptions} />

      <section className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardContent className="p-0">
            <div className="border-b px-5 py-4">
              <h2 className="font-semibold">Empresas registradas</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companyRows.length ? (
                  companyRows.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {company.slug}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{company.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      Aún no hay empresas.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="border-b px-5 py-4">
              <h2 className="font-semibold">Usuarios y asignaciones</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Rol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userRows.map((user) => (
                  <TableRow key={`${user.id}-${user.companyName ?? "platform"}`}>
                    <TableCell>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </TableCell>
                    <TableCell>{user.companyName ?? "Plataforma"}</TableCell>
                    <TableCell>
                      <Badge variant={user.platformRole === "platform_admin" ? "default" : "secondary"}>
                        {user.platformRole === "platform_admin"
                          ? "Superadmin"
                          : roleLabels[user.membershipRole ?? ""] ?? "Usuario"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
