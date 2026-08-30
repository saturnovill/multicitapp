import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { SaleReceipt } from "@/components/sale-receipt";
import { getDb } from "@/db";
import { sales } from "@/db/schema";
import { getSaleDetail } from "@/lib/sales-data";

export const metadata: Metadata = { title: "Detalle de venta | Superadministración" };

export default async function AdminSaleDetailPage({ params }: { params: Promise<{ saleId: string }> }) {
  const { saleId } = await params;
  const [row] = await getDb().select({ companyId: sales.companyId }).from(sales).where(eq(sales.id, saleId)).limit(1);
  if (!row) notFound();
  const detail = await getSaleDetail(row.companyId, saleId);
  if (!detail) notFound();
  return <main className="px-5 py-8 sm:px-8"><SaleReceipt detail={detail} /></main>;
}
