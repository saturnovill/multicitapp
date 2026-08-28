import type { Metadata } from "next";
import { LockKeyhole, UserPlus } from "lucide-react";

import { AdminPageHeader } from "@/components/admin-page-header";
import { PasswordForm } from "@/components/admin-forms";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Seguridad | Superadministración" };

export default function SecurityPage() {
  return (
    <main className="mx-auto max-w-[1100px] px-5 py-8 sm:px-8">
      <AdminPageHeader eyebrow="Cuenta de plataforma" title="Seguridad" description="Administra tu contraseña y revisa las políticas de acceso de la plataforma." />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <PasswordForm />
        <div className="space-y-4">
          <Card><CardContent className="flex gap-4 p-5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><LockKeyhole className="size-5" /></span><div><p className="font-medium">Registro cerrado</p><p className="mt-1 text-sm leading-6 text-muted-foreground">No existe registro público. Las solicitudes de creación de cuenta desde la API también están bloqueadas.</p></div></CardContent></Card>
          <Card><CardContent className="flex gap-4 p-5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><UserPlus className="size-5" /></span><div><p className="font-medium">Alta controlada</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Solo el superadministrador autenticado puede crear empresas, usuarios y asignaciones desde esta consola.</p></div></CardContent></Card>
        </div>
      </div>
    </main>
  );
}
