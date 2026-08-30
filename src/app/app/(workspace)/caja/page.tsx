import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { CashDashboard } from "@/components/cash-dashboard";
import { getAuthSession } from "@/lib/auth/server";
import { getCashData } from "@/lib/commerce-data";
import { getTenantContext } from "@/lib/tenant";

export const metadata: Metadata = { title: "Caja" };
export default async function CashPage() { const { data: session } = await getAuthSession(); if (!session?.user) redirect("/login"); const context = await getTenantContext(session.user.id); if (!context) redirect("/app/sin-acceso"); if (!["owner", "admin", "manager", "receptionist"].includes(context.role)) redirect("/app/citas"); const data = await getCashData(context.companyId); return <div className="p-4 sm:p-6 lg:p-8"><header className="mb-7"><Badge variant="secondary">Operación financiera</Badge><h1 className="mt-3 text-3xl font-semibold tracking-tight">Caja</h1><p className="mt-2 text-sm text-muted-foreground">Aperturas, movimientos, conciliación y cierres por sucursal.</p></header><CashDashboard companyId={context.companyId} currency={context.currency} data={data} /></div>; }
