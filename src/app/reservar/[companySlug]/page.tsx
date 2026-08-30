import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { PublicBookingWizard } from "@/components/public-booking-wizard";
import { Button } from "@/components/ui/button";
import { addCalendarDays, dateInTimezone } from "@/lib/date-time";
import { getPublicBookingCatalog } from "@/lib/public-booking";

type PageProps = { params: Promise<{ companySlug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { companySlug } = await params;
  const catalog = await getPublicBookingCatalog(companySlug);
  if (!catalog) return { title: "Reservación no disponible" };
  return { title: `Reservar con ${catalog.company.name}`, description: `Agenda una cita en línea con ${catalog.company.name}.` };
}

export default async function PublicBookingPage({ params }: PageProps) {
  const { companySlug } = await params;
  const catalog = await getPublicBookingCatalog(companySlug);
  if (!catalog) notFound();
  const minDate = dateInTimezone(new Date(), catalog.company.timezone);
  const maxDate = addCalendarDays(minDate, 31);

  return (
    <main className="min-h-svh bg-stone-50/70">
      <header className="border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8"><Link href="/" aria-label="Ir al inicio"><BrandMark /></Link><Button asChild variant="ghost"><Link href="/login">Acceso de personal</Link></Button></div>
      </header>
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <section className="mb-8 max-w-3xl"><p className="text-sm font-semibold text-violet-700">Reservación en línea</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Agenda con {catalog.company.name}</h1><p className="mt-3 text-pretty text-muted-foreground">Elige los servicios y encuentra un horario disponible. Tu solicitud quedará pendiente de confirmación por la empresa.</p></section>
        <PublicBookingWizard catalog={catalog} minDate={minDate} maxDate={maxDate} />
      </div>
    </main>
  );
}
