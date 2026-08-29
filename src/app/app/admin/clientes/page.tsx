import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin-page-header";
import { CustomerDirectory } from "@/components/customer-directory";
export const metadata: Metadata = { title: "Clientes | Superadministración" };
export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) { const query = await searchParams; return <main className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8"><AdminPageHeader eyebrow="Directorio global" title="Clientes" description="Consulta clientes e historiales de todas las empresas." /><CustomerDirectory detailBasePath="/app/admin/clientes" canManage showCompany query={typeof query.q === "string" ? query.q : ""} /></main>; }
