"use client";

import { useState } from "react";
import { LoaderCircle, LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/client";

export function ChangePasswordForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage(null);
    const data = new FormData(event.currentTarget); const currentPassword = String(data.get("currentPassword") ?? ""); const newPassword = String(data.get("newPassword") ?? ""); const confirmation = String(data.get("confirmation") ?? "");
    if (newPassword.length < 12 || newPassword !== confirmation) { setMessage({ ok: false, text: newPassword !== confirmation ? "Las contraseñas no coinciden" : "Usa al menos 12 caracteres" }); setPending(false); return; }
    const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    setMessage(result.error ? { ok: false, text: result.error.message ?? "No fue posible cambiar la contraseña" } : { ok: true, text: "Contraseña actualizada" }); setPending(false); if (!result.error) event.currentTarget.reset();
  }
  return <Card className="max-w-xl"><CardHeader><CardTitle>Contraseña</CardTitle><CardDescription>Cambia tu contraseña y cierra las demás sesiones abiertas.</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><div className="space-y-2"><Label htmlFor="currentPassword">Contraseña actual</Label><Input id="currentPassword" name="currentPassword" type="password" required /></div><div className="space-y-2"><Label htmlFor="newPassword">Nueva contraseña</Label><Input id="newPassword" name="newPassword" type="password" minLength={12} required /></div><div className="space-y-2"><Label htmlFor="confirmation">Confirmar contraseña</Label><Input id="confirmation" name="confirmation" type="password" minLength={12} required /></div>{message ? <p role="status" className={message.ok ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{message.text}</p> : null}<Button disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <LockKeyhole />}{pending ? "Actualizando…" : "Cambiar contraseña"}</Button></form></CardContent></Card>;
}
