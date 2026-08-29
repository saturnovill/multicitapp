import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CustomerDirectory } from "@/components/customer-directory";
import { Badge } from "@/components/ui/badge";
import { getAuthSession } from "@/lib/auth/server";
import { getTenantContext } from "@/lib/tenant";
export const metadata: Metadata = { title: "Clientes" };
export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) { const [{ data: session }, query] = await Promise.all([getAuthSession(), searchParams]); if (!session?.user) redirect("/login"); const context = await getTenantContext(session.user.id); if (!context) redirect("/app/sin-acceso"); return <div className="p-4 sm:p-6 lg:p-8"><header className="mb-7"><Badge variant="secondary">Directorio</Badge><h1 className="mt-3 text-3xl font-semibold tracking-tight">Clientes</h1><p className="mt-2 text-sm text-muted-foreground">Contactos e historial de citas de {context.companyName}.</p></header><CustomerDirectory companyId={context.companyId} detailBasePath="/app/clientes" canManage={["owner", "admin", "manager", "receptionist"].includes(context.role)} showCompany={false} query={typeof query.q === "string" ? query.q : ""} /></div>; }
