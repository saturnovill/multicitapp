import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { CompanySettingsForm } from "@/components/company-settings-form";
import { Badge } from "@/components/ui/badge";
import { getDb } from "@/db";
import { companies } from "@/db/schema";
import { getAuthSession } from "@/lib/auth/server";
import { getTenantContext } from "@/lib/tenant";
export const metadata: Metadata = { title: "Configuración" };
export default async function SettingsPage() { const { data: session } = await getAuthSession(); if (!session?.user) redirect("/login"); const context = await getTenantContext(session.user.id); if (!context) redirect("/app/sin-acceso"); if (!["owner", "admin"].includes(context.role)) redirect("/app"); const [company] = await getDb().select({ id: companies.id, name: companies.name, timezone: companies.timezone, currency: companies.currency }).from(companies).where(eq(companies.id, context.companyId)).limit(1); if (!company) redirect("/app/sin-acceso"); return <div className="p-4 sm:p-6 lg:p-8"><header className="mb-7"><Badge variant="secondary">Empresa</Badge><h1 className="mt-3 text-3xl font-semibold tracking-tight">Configuración</h1><p className="mt-2 text-sm text-muted-foreground">Preferencias generales de {company.name}.</p></header><CompanySettingsForm company={company} /></div>; }
