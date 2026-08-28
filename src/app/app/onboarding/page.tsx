import type { Metadata } from "next";
import { Building2, MapPin, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthSession } from "@/lib/auth/server";
import { getTenantContext } from "@/lib/tenant";

import { createCompany } from "./actions";

export const metadata: Metadata = { title: "Configura tu empresa" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { data: session } = await getAuthSession();
  if (!session?.user) redirect("/login");
  if (await getTenantContext(session.user.id)) redirect("/app/agenda");

  return (
    <main className="flex min-h-svh items-center justify-center bg-[#f7f5fa] px-5 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-600/15">
            <Sparkles className="size-5" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">
            Prepara tu espacio de trabajo
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Crea tu primera empresa y sucursal. Podrás agregar más sucursales y
            colaboradores después.
          </p>
        </div>

        <Card className="border-stone-200/80 shadow-xl shadow-stone-950/[0.04]">
          <CardContent className="p-6 sm:p-8">
            <form action={createCompany} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nombre de la empresa</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="companyName"
                    name="companyName"
                    className="pl-9"
                    placeholder="Acme Servicios"
                    minLength={2}
                    maxLength={160}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branchName">Primera sucursal</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="branchName"
                    name="branchName"
                    className="pl-9"
                    placeholder="Sucursal Centro"
                    minLength={2}
                    maxLength={160}
                    required
                  />
                </div>
              </div>

              <input
                type="hidden"
                name="timezone"
                value="America/Hermosillo"
              />

              <Button
                size="lg"
                className="w-full bg-violet-600 hover:bg-violet-700"
              >
                Crear espacio de trabajo
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
