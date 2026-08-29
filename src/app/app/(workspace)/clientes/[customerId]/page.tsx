import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { CustomerDetail } from "@/components/customer-detail";
import { getAuthSession } from "@/lib/auth/server";
import { getTenantContext } from "@/lib/tenant";
export const metadata: Metadata = { title: "Cliente" };
export default async function CustomerPage({ params }: { params: Promise<{ customerId: string }> }) { const [{ customerId }, { data: session }] = await Promise.all([params, getAuthSession()]); if (!session?.user) redirect("/login"); if (!z.uuid().safeParse(customerId).success) notFound(); const context = await getTenantContext(session.user.id); if (!context) redirect("/app/sin-acceso"); return <CustomerDetail customerId={customerId} companyId={context.companyId} backHref="/app/clientes" calendarBasePath="/app/citas" canManage={["owner", "admin", "manager", "receptionist"].includes(context.role)} />; }
