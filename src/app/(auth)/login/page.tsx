import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function LoginPage() {
  return (
    <div>
      <p className="text-sm font-medium text-violet-700">Bienvenido de nuevo</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Inicia sesión en Multicita
      </h1>
      <p className="mb-8 mt-3 text-sm leading-6 text-muted-foreground">
        Accede a la operación diaria de tu empresa.
      </p>
      <AuthForm mode="login" />
    </div>
  );
}
