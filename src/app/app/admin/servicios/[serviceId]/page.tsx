import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ServiceDetail } from "@/components/service-detail";
export const metadata: Metadata = { title: "Servicio | Superadministración" };
export default async function AdminServicePage({ params }: { params: Promise<{ serviceId: string }> }) { const { serviceId } = await params; if (!z.uuid().safeParse(serviceId).success) notFound(); return <ServiceDetail serviceId={serviceId} backHref="/app/admin/servicios" canManage />; }
