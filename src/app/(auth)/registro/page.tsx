import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <div>
      <p className="text-sm font-medium text-violet-700">Empieza en minutos</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Crea tu cuenta
      </h1>
      <p className="mb-8 mt-3 text-sm leading-6 text-muted-foreground">
        Después configurarás tu primera empresa y sucursal.
      </p>
      <AuthForm mode="register" />
    </div>
  );
}
