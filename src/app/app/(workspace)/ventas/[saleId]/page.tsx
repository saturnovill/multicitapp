import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { SaleReceipt } from "@/components/sale-receipt";
import { getAuthSession } from "@/lib/auth/server";
import { getSaleDetail } from "@/lib/sales-data";
import { getTenantContext } from "@/lib/tenant";

export const metadata: Metadata = { title: "Detalle de venta" };

export default async function SaleDetailPage({ params }: { params: Promise<{ saleId: string }> }) {
  const { data: session } = await getAuthSession();
  if (!session?.user) redirect("/login");
  const context = await getTenantContext(session.user.id);
  if (!context) redirect("/app/sin-acceso");
  const detail = await getSaleDetail(context.companyId, (await params).saleId);
  if (!detail) notFound();
  return <div className="p-4 sm:p-6 lg:p-8"><SaleReceipt detail={detail} /></div>;
}
