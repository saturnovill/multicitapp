import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CustomerDetail } from "@/components/customer-detail";
export const metadata: Metadata = { title: "Cliente | Superadministración" };
export default async function AdminCustomerPage({ params }: { params: Promise<{ customerId: string }> }) { const { customerId } = await params; if (!z.uuid().safeParse(customerId).success) notFound(); return <CustomerDetail customerId={customerId} backHref="/app/admin/clientes" calendarBasePath="/app/admin/citas" canManage />; }
