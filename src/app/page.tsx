import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarRange,
  CheckCircle2,
  UsersRound,
} from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Building2,
    title: "Multiempresa real",
    description:
      "Cada empresa opera con sus propias sucursales, colaboradores, clientes y configuraciones.",
  },
  {
    icon: CalendarRange,
    title: "Agenda diaria visual",
    description:
      "Una columna por colaborador para entender la disponibilidad y operar con rapidez.",
  },
  {
    icon: UsersRound,
    title: "Equipo y permisos",
    description:
      "Accesos por rol y sucursal, preparados para organizaciones pequeñas o en crecimiento.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-svh overflow-hidden bg-[#faf9fc]">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <header className="flex h-20 items-center justify-between">
          <BrandMark />
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Button asChild className="bg-violet-600 hover:bg-violet-700">
              <Link href="/registro">Crear cuenta</Link>
            </Button>
          </nav>
        </header>

        <section className="relative py-20 text-center sm:py-28">
          <div className="absolute left-1/2 top-12 -z-0 h-72 w-[44rem] -translate-x-1/2 rounded-full bg-violet-300/20 blur-3xl" />
          <div className="relative z-10 mx-auto max-w-4xl">
            <div className="mx-auto mb-7 flex w-fit items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-violet-800 shadow-sm backdrop-blur">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Creado para empresas que trabajan con citas
            </div>
            <h1 className="text-balance text-5xl font-semibold leading-[1.03] tracking-[-0.045em] text-[#1d1826] sm:text-7xl">
              La agenda que mantiene a toda tu empresa en sintonía.
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-pretty text-lg leading-8 text-stone-600 sm:text-xl">
              Organiza sucursales, colaboradores, servicios y clientes desde una
              plataforma rápida, clara y lista para crecer contigo.
            </p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="h-12 bg-violet-600 px-6 shadow-lg shadow-violet-600/15 hover:bg-violet-700"
              >
                <Link href="/registro">
                  Configurar mi empresa
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 bg-white">
                <Link href="/login">Ya tengo una cuenta</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-20 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm shadow-stone-950/[0.025]"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-5 font-semibold tracking-tight">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
