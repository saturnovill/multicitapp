"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const result =
        mode === "register"
          ? await authClient.signUp.email({
              email,
              password,
              name: String(formData.get("name") ?? "").trim(),
            })
          : await authClient.signIn.email({ email, password });

      if (result.error) {
        setError(
          result.error.message ??
            "No fue posible completar la solicitud. Revisa tus datos.",
        );
        return;
      }

      router.push("/app");
      router.refresh();
    } catch {
      setError("Ocurrió un error de conexión. Inténtalo de nuevo.");
    } finally {
      setIsPending(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {isRegister ? (
        <div className="space-y-2">
          <Label htmlFor="name">Nombre completo</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="María González"
            required
            minLength={2}
            disabled={isPending}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@empresa.com"
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="password">Contraseña</Label>
          {!isRegister ? (
            <span className="text-xs text-muted-foreground">Mínimo 8 caracteres</span>
          ) : null}
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={8}
          required
          disabled={isPending}
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      ) : null}

      <Button className="w-full" size="lg" disabled={isPending}>
        {isPending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : null}
        {isRegister ? "Crear cuenta" : "Iniciar sesión"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isRegister ? "¿Ya tienes una cuenta?" : "¿Aún no tienes cuenta?"}{" "}
        <Link
          className="font-medium text-violet-700 underline-offset-4 hover:underline"
          href={isRegister ? "/login" : "/registro"}
        >
          {isRegister ? "Inicia sesión" : "Regístrate"}
        </Link>
      </p>
    </form>
  );
}
