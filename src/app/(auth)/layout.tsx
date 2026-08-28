import Link from "next/link";
import { Check } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="grid min-h-svh bg-stone-50 lg:grid-cols-[minmax(0,1fr)_minmax(480px,0.78fr)]">
      <section className="relative hidden overflow-hidden bg-[#17131f] px-12 py-10 text-white lg:flex lg:flex-col">
        <div className="absolute -left-32 top-1/3 size-96 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="absolute -right-24 -top-24 size-80 rounded-full bg-fuchsia-400/15 blur-3xl" />
        <Link href="/" className="relative z-10 w-fit">
          <BrandMark />
        </Link>
        <div className="relative z-10 my-auto max-w-xl">
          <p className="mb-5 text-sm font-medium uppercase tracking-[0.22em] text-violet-300">
            Operación en un solo lugar
          </p>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight">
            Tu agenda y tu equipo, siempre sincronizados.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/65">
            Administra empresas, sucursales, colaboradores y citas desde una
            vista diaria clara y rápida.
          </p>
          <ul className="mt-10 grid gap-4 text-sm text-white/80 sm:grid-cols-2">
            {["Agenda por colaborador", "Múltiples sucursales", "Roles y permisos", "Datos aislados por empresa"].map(
              (item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <span className="grid size-5 place-items-center rounded-full bg-violet-400/20 text-violet-200">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                  {item}
                </li>
              ),
            )}
          </ul>
        </div>
        <p className="relative z-10 text-xs text-white/35">
          Multicita · Gestión de citas para cualquier industria
        </p>
      </section>
      <section className="flex min-h-svh items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-10 block w-fit lg:hidden">
            <BrandMark />
          </Link>
          {children}
        </div>
      </section>
    </main>
  );
}
