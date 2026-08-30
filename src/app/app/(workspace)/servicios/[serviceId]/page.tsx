import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { ServiceDetail } from "@/components/service-detail";
import { getAuthSession } from "@/lib/auth/server";
import { getTenantContext } from "@/lib/tenant";
export const metadata: Metadata = { title: "Servicio" };
export default async function ServicePage({ params }: { params: Promise<{ serviceId: string }> }) { const [{ serviceId }, { data: session }] = await Promise.all([params, getAuthSession()]); if (!session?.user) redirect("/login"); if (!z.uuid().safeParse(serviceId).success) notFound(); const context = await getTenantContext(session.user.id); if (!context) redirect("/app/sin-acceso"); return <ServiceDetail serviceId={serviceId} companyId={context.companyId} backHref="/app/servicios" canManage={["owner", "admin", "manager"].includes(context.role)} />; }
