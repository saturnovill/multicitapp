import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BranchDirectory } from "@/components/branch-directory";
import { Badge } from "@/components/ui/badge";
import { getAuthSession } from "@/lib/auth/server";
import { getTenantContext } from "@/lib/tenant";
export const metadata: Metadata = { title: "Sucursales" };
export default async function BranchesPage() { const { data: session } = await getAuthSession(); if (!session?.user) redirect("/login"); const context = await getTenantContext(session.user.id); if (!context) redirect("/app/sin-acceso"); return <div className="p-4 sm:p-6 lg:p-8"><header className="mb-7"><Badge variant="secondary">Ubicaciones</Badge><h1 className="mt-3 text-3xl font-semibold tracking-tight">Sucursales</h1><p className="mt-2 text-sm text-muted-foreground">Ubicaciones y horarios generales de {context.companyName}.</p></header><BranchDirectory companyId={context.companyId} detailBasePath="/app/sucursales" canManage={["owner", "admin", "manager"].includes(context.role)} showCompany={false} defaultTimezone={context.timezone} /></div>; }
