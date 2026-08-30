import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { sales } from "@/db/schema";
import { canManageSales, requireCompanyOperator } from "@/lib/company-operator";
import { createTextPdf } from "@/lib/pdf";
import { getSaleDetail } from "@/lib/sales-data";

export async function GET(_request: Request, { params }: { params: Promise<{ saleId: string }> }) {
  try {
    const { saleId } = await params;
    const [scope] = await getDb().select({ companyId: sales.companyId }).from(sales).where(eq(sales.id, saleId)).limit(1);
    if (!scope) return NextResponse.json({ message: "Venta no encontrada" }, { status: 404 });
    const operator = await requireCompanyOperator(scope.companyId);
    if (!canManageSales(operator)) return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    const detail = await getSaleDetail(scope.companyId, saleId);
    if (!detail) return NextResponse.json({ message: "Venta no encontrada" }, { status: 404 });
    const { sale, items, payments } = detail;
    const money = (cents: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: sale.currency }).format(cents / 100);
    const method = { cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia" } as const;
    const bytes = await createTextPdf(`Recibo ${sale.folio}`, [
      { text: sale.companyName, bold: true, size: 13 },
      { text: `${sale.branchName} | ${new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short" }).format(sale.createdAt)}` },
      { text: `Cliente: ${sale.customerName ?? "Publico general"}` },
      { text: `Estado: ${sale.status === "cancelled" ? "CANCELADA" : "COMPLETADA"}`, bold: true },
      { text: " " },
      { text: "SERVICIOS", bold: true },
      ...items.map((item) => ({ text: `${item.quantity} x ${item.serviceName} - ${item.employeeName} | ${money(item.lineTotalCents)}` })),
      { text: " " },
      { text: `Subtotal: ${money(sale.subtotalCents)}` },
      { text: `Descuento: -${money(sale.discountCents)}` },
      { text: `Impuestos: ${money(sale.taxCents)}` },
      { text: `TOTAL: ${money(sale.totalCents)}`, bold: true, size: 13 },
      { text: `Pagado: ${money(sale.paidCents)} | Cambio: ${money(sale.changeCents)}` },
      { text: " " },
      { text: "PAGOS", bold: true },
      ...payments.map((payment) => ({ text: `${method[payment.method]}${payment.reference ? ` (${payment.reference})` : ""}: ${money(payment.amountCents)}` })),
      ...(sale.cancellationReason ? [{ text: " " }, { text: `Motivo de cancelacion: ${sale.cancellationReason}`, bold: true }] : []),
      ...(sale.notes ? [{ text: `Notas: ${sale.notes}` }] : []),
    ]);
    return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${sale.folio}.pdf"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[sales:receipt] failed", { error: String(error) });
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }
}
