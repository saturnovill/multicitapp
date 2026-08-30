import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CompanySettingsForm } from "@/components/company-settings-form";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { companies } from "@/db/schema";
export const metadata: Metadata = { title: "Configurar empresa | Superadministración" };
export default async function AdminCompanySettingsPage({ params }: { params: Promise<{ companyId: string }> }) { const { companyId } = await params; if (!z.uuid().safeParse(companyId).success) notFound(); const [company] = await getDb().select({ id: companies.id, name: companies.name, slug: companies.slug, timezone: companies.timezone, currency: companies.currency }).from(companies).where(eq(companies.id, companyId)).limit(1); if (!company) notFound(); return <main className="mx-auto max-w-[1200px] px-5 py-8 sm:px-8"><header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold tracking-tight">Configurar {company.name}</h1><p className="mt-2 text-sm text-muted-foreground">Preferencias generales de la empresa.</p></div><Button asChild variant="outline"><Link href={`/reservar/${company.slug}`} target="_blank" rel="noreferrer"><ExternalLink />Ver reservación pública</Link></Button></header><CompanySettingsForm company={company} /></main>; }
