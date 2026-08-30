import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";

import { AdminPageHeader } from "@/components/admin-page-header";
import { UserForm } from "@/components/admin-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { UserAccessControls } from "@/components/user-access-controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db";
import { appUsers, companies, companyMemberships } from "@/db/schema";

export const metadata: Metadata = { title: "Usuarios | Superadministración" };

const roleLabels: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  manager: "Gerente",
  receptionist: "Recepción",
  employee: "Empleado",
};

export default async function UsersPage() {
  const db = getDb();
  const [companyRows, userRows] = await Promise.all([
    db.select({ id: companies.id, name: companies.name }).from(companies).orderBy(asc(companies.name)),
    db.select({ id: appUsers.id, name: appUsers.name, email: appUsers.email, platformRole: appUsers.platformRole, active: appUsers.isActive, membershipId: companyMemberships.id, companyId: companies.id, companyName: companies.name, membershipRole: companyMemberships.role, membershipStatus: companyMemberships.status }).from(appUsers).leftJoin(companyMemberships, eq(companyMemberships.userId, appUsers.id)).leftJoin(companies, eq(companies.id, companyMemberships.companyId)).orderBy(asc(appUsers.name), asc(companies.name)),
  ]);

  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
      <AdminPageHeader eyebrow="Accesos globales" title="Usuarios" description="Crea credenciales, asigna roles y consulta los accesos de todas las empresas." />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Usuario</TableHead><TableHead>Empresa</TableHead><TableHead>Rol</TableHead><TableHead>Estado</TableHead><TableHead>Administrar</TableHead></TableRow></TableHeader>
              <TableBody>
                {userRows.length ? userRows.map((user) => (
                  <TableRow key={`${user.id}-${user.companyId ?? "platform"}`}>
                    <TableCell><p className="font-medium">{user.name}</p><p className="text-xs text-muted-foreground">{user.email}</p></TableCell>
                    <TableCell>{user.companyName ?? "Plataforma"}</TableCell>
                    <TableCell><Badge variant={user.platformRole === "platform_admin" ? "default" : "secondary"}>{user.platformRole === "platform_admin" ? "Superadmin" : roleLabels[user.membershipRole ?? ""] ?? "Sin rol"}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{user.active && user.membershipStatus !== "suspended" ? "Activo" : "Suspendido"}</Badge></TableCell>
                    <TableCell>{user.membershipId && user.membershipRole && user.membershipStatus ? <UserAccessControls appUserId={user.id} membershipId={user.membershipId} role={user.membershipRole} status={user.membershipStatus} /> : <span className="text-xs text-muted-foreground">Cuenta de plataforma</span>}</TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={5} className="h-28 text-center text-muted-foreground">Aún no hay usuarios.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <UserForm companies={companyRows} />
      </div>
    </main>
  );
}
