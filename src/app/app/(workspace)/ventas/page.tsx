import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { SalesList } from "@/components/sales-list";
import { Badge } from "@/components/ui/badge";
import { getDb } from "@/db";
import { branches } from "@/db/schema";
import { getAuthSession } from "@/lib/auth/server";
import { getTenantContext } from "@/lib/tenant";

export const metadata: Metadata = { title: "Ventas" };

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; branchId?: string }> }) {
  const { data: session } = await getAuthSession();
  if (!session?.user) redirect("/login");
  const context = await getTenantContext(session.user.id);
  if (!context) redirect("/app/sin-acceso");
  const branchRows = await getDb().select({ id: branches.id, name: branches.name }).from(branches).where(eq(branches.companyId, context.companyId)).orderBy(asc(branches.name));
  return <div className="p-4 sm:p-6 lg:p-8"><header className="mb-7"><Badge variant="secondary">Punto de venta</Badge><h1 className="mt-3 text-3xl font-semibold tracking-tight">Ventas</h1><p className="mt-2 text-sm text-muted-foreground">Cobros, folios, recibos y cancelaciones de {context.companyName}.</p></header><SalesList companyId={context.companyId} basePath="/app/ventas" newHref="/app/ventas/nueva" filters={await searchParams} branches={branchRows} /></div>;
}
