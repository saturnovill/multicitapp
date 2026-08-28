import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";

import { AdminPageHeader } from "@/components/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db";
import { appUsers, auditLogs, companies } from "@/db/schema";

export const metadata: Metadata = { title: "Auditoría | Superadministración" };

const dateTimeFormatter = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Hermosillo" });

export default async function AuditPage() {
  const rows = await getDb().select({ id: auditLogs.id, action: auditLogs.action, entityType: auditLogs.entityType, entityId: auditLogs.entityId, occurredAt: auditLogs.occurredAt, companyName: companies.name, actorName: appUsers.name, actorEmail: appUsers.email }).from(auditLogs).leftJoin(companies, eq(companies.id, auditLogs.companyId)).leftJoin(appUsers, eq(appUsers.id, auditLogs.actorUserId)).orderBy(desc(auditLogs.occurredAt)).limit(250);

  return (
    <main className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8">
      <AdminPageHeader eyebrow="Trazabilidad" title="Auditoría" description="Historial global de acciones administrativas. Se muestran los 250 eventos más recientes." />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Acción</TableHead><TableHead>Responsable</TableHead><TableHead>Empresa</TableHead><TableHead>Entidad</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.length ? rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{dateTimeFormatter.format(row.occurredAt)}</TableCell>
                  <TableCell><Badge variant="secondary">{row.action}</Badge></TableCell>
                  <TableCell><p>{row.actorName ?? "Sistema"}</p>{row.actorEmail ? <p className="text-xs text-muted-foreground">{row.actorEmail}</p> : null}</TableCell>
                  <TableCell>{row.companyName ?? "Plataforma"}</TableCell>
                  <TableCell><p>{row.entityType}</p><p className="max-w-40 truncate text-xs text-muted-foreground">{row.entityId ?? "—"}</p></TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={5} className="h-28 text-center text-muted-foreground">Aún no hay eventos de auditoría.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
