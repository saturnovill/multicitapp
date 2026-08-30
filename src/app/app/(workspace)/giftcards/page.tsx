import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { GiftCardDashboard } from "@/components/gift-card-dashboard";
import { getAuthSession } from "@/lib/auth/server";
import { getGiftCardData } from "@/lib/commerce-data";
import { getTenantContext } from "@/lib/tenant";

export const metadata: Metadata = { title: "Gift cards" };
export default async function GiftCardsPage() { const { data: session } = await getAuthSession(); if (!session?.user) redirect("/login"); const context = await getTenantContext(session.user.id); if (!context) redirect("/app/sin-acceso"); if (!["owner", "admin", "manager", "receptionist"].includes(context.role)) redirect("/app/citas"); const data = await getGiftCardData(context.companyId); return <div className="p-4 sm:p-6 lg:p-8"><header className="mb-7"><Badge variant="secondary">Saldo prepago</Badge><h1 className="mt-3 text-3xl font-semibold tracking-tight">Gift cards</h1><p className="mt-2 text-sm text-muted-foreground">Emisión, vigencia, saldo e historial de movimientos.</p></header><GiftCardDashboard companyId={context.companyId} currency={context.currency} data={data} /></div>; }
