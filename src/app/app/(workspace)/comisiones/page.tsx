import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { CommissionDashboard } from "@/components/commission-dashboard";
import { getAuthSession } from "@/lib/auth/server";
import { getCommissionData } from "@/lib/commerce-data";
import { getTenantContext } from "@/lib/tenant";

export const metadata: Metadata = { title: "Comisiones" };
export default async function CommissionsPage() { const { data: session } = await getAuthSession(); if (!session?.user) redirect("/login"); const context = await getTenantContext(session.user.id); if (!context) redirect("/app/sin-acceso"); if (!["owner", "admin", "manager"].includes(context.role)) redirect("/app/citas"); const data = await getCommissionData(context.companyId); return <div className="p-4 sm:p-6 lg:p-8"><header className="mb-7"><Badge variant="secondary">Nómina operativa</Badge><h1 className="mt-3 text-3xl font-semibold tracking-tight">Comisiones</h1><p className="mt-2 text-sm text-muted-foreground">Reglas, cálculos por ventas, ajustes y aprobación.</p></header><CommissionDashboard companyId={context.companyId} currency={context.currency} data={data} /></div>; }
