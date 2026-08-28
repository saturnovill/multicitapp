import { ShieldX } from "lucide-react";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth/server";

export default function NoAccessPage() {
  async function signOut() {
    "use server";
    await auth.signOut();
    redirect("/login");
  }

  return (
    <main className="grid min-h-svh place-items-center bg-stone-50 px-5">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-red-50 text-red-700">
          <ShieldX className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          Tu cuenta aún no tiene acceso
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Pide al superadministrador que te asigne una empresa y un rol.
        </p>
        <form action={signOut} className="mt-6">
          <Button type="submit" variant="outline">
            Cerrar sesión
          </Button>
        </form>
      </div>
    </main>
  );
}
