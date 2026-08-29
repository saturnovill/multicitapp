import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { BranchDetail } from "@/components/branch-detail";
import { getAuthSession } from "@/lib/auth/server";
import { getTenantContext } from "@/lib/tenant";
export const metadata: Metadata = { title: "Sucursal" };
export default async function BranchPage({ params }: { params: Promise<{ branchId: string }> }) { const [{ branchId }, { data: session }] = await Promise.all([params, getAuthSession()]); if (!session?.user) redirect("/login"); if (!z.uuid().safeParse(branchId).success) notFound(); const context = await getTenantContext(session.user.id); if (!context) redirect("/app/sin-acceso"); return <BranchDetail branchId={branchId} companyId={context.companyId} backHref="/app/sucursales" canManage={["owner", "admin", "manager"].includes(context.role)} />; }
