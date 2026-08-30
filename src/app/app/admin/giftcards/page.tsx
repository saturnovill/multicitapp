import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { AdminCompanyPicker } from "@/components/admin-company-picker";
import { AdminPageHeader } from "@/components/admin-page-header";
import { GiftCardDashboard } from "@/components/gift-card-dashboard";
import { getDb } from "@/db";
import { companies } from "@/db/schema";
import { getGiftCardData } from "@/lib/commerce-data";

export const metadata: Metadata = { title: "Gift cards | Superadministración" };
export default async function AdminGiftCardsPage({ searchParams }: { searchParams: Promise<{ companyId?: string }> }) { const query = await searchParams; const rows = await getDb().select({ id: companies.id, name: companies.name, currency: companies.currency }).from(companies).where(eq(companies.status, "active")).orderBy(asc(companies.name)); const selected = rows.find((row) => row.id === query.companyId); const data = selected ? await getGiftCardData(selected.id) : null; return <main className="mx-auto max-w-[1600px] px-5 py-8 sm:px-8"><AdminPageHeader eyebrow="Saldo prepago" title="Gift cards" description="Emite y supervisa tarjetas de cualquier empresa." /><AdminCompanyPicker companies={rows} selectedId={selected?.id} />{selected && data ? <GiftCardDashboard companyId={selected.id} currency={selected.currency} data={data} /> : null}</main>; }
