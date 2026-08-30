import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import { redirect } from "next/navigation";
import { CompanySettingsForm } from "@/components/company-settings-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { companies } from "@/db/schema";
import { getAuthSession } from "@/lib/auth/server";
import { getTenantContext } from "@/lib/tenant";
export const metadata: Metadata = { title: "Configuración" };
export default async function SettingsPage() { const { data: session } = await getAuthSession(); if (!session?.user) redirect("/login"); const context = await getTenantContext(session.user.id); if (!context) redirect("/app/sin-acceso"); if (!["owner", "admin"].includes(context.role)) redirect("/app"); const [company] = await getDb().select({ id: companies.id, name: companies.name, slug: companies.slug, timezone: companies.timezone, currency: companies.currency, appointmentIntervalMinutes: companies.appointmentIntervalMinutes, bookingLeadMinutes: companies.bookingLeadMinutes }).from(companies).where(eq(companies.id, context.companyId)).limit(1); if (!company) redirect("/app/sin-acceso"); return <div className="p-4 sm:p-6 lg:p-8"><header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><Badge variant="secondary">Empresa</Badge><h1 className="mt-3 text-3xl font-semibold tracking-tight">Configuración</h1><p className="mt-2 text-sm text-muted-foreground">Preferencias generales de {company.name}.</p></div><Button asChild variant="outline"><Link href={`/reservar/${company.slug}`} target="_blank" rel="noreferrer"><ExternalLink />Ver reservación pública</Link></Button></header><CompanySettingsForm company={company} /></div>; }
