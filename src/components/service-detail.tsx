import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { ServiceForm } from "@/components/service-form";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { serviceCategories, services } from "@/db/schema";
export async function ServiceDetail({ serviceId, companyId, backHref, canManage }: { serviceId: string; companyId?: string; backHref: string; canManage: boolean }) { const db = getDb(); const [service] = await db.select().from(services).where(companyId ? and(eq(services.id, serviceId), eq(services.companyId, companyId)) : eq(services.id, serviceId)).limit(1); if (!service) notFound(); const categories = await db.select({ id: serviceCategories.id, companyId: serviceCategories.companyId, name: serviceCategories.name }).from(serviceCategories).where(eq(serviceCategories.companyId, service.companyId)).orderBy(asc(serviceCategories.name)); return <div className="p-4 sm:p-6 lg:p-8"><header className="mb-7"><Button variant="ghost" size="sm" asChild className="-ml-3"><Link href={backHref}><ArrowLeft />Volver</Link></Button><h1 className="mt-3 text-3xl font-semibold tracking-tight">{service.name}</h1><p className="mt-2 text-sm text-muted-foreground">Configura precio, duración, estado y visibilidad.</p></header>{canManage ? <div className="max-w-2xl"><ServiceForm companies={[]} categories={categories} fixedCompanyId={service.companyId} service={service} /></div> : <p className="rounded-xl border bg-white p-6 text-sm text-muted-foreground">No tienes permisos para modificar este servicio.</p>}</div>; }
