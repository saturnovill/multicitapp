import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CompanySettingsForm } from "@/components/company-settings-form";
import { getDb } from "@/db";
import { companies } from "@/db/schema";
export const metadata: Metadata = { title: "Configurar empresa | Superadministración" };
export default async function AdminCompanySettingsPage({ params }: { params: Promise<{ companyId: string }> }) { const { companyId } = await params; if (!z.uuid().safeParse(companyId).success) notFound(); const [company] = await getDb().select({ id: companies.id, name: companies.name, timezone: companies.timezone, currency: companies.currency }).from(companies).where(eq(companies.id, companyId)).limit(1); if (!company) notFound(); return <main className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8"><h1 className="text-3xl font-semibold tracking-tight">Configurar {company.name}</h1><p className="mb-7 mt-2 text-sm text-muted-foreground">Preferencias generales de la empresa.</p><CompanySettingsForm company={company} /></main>; }
