import type { Metadata } from "next";

import { ChangePasswordForm } from "@/components/change-password-form";

export const metadata: Metadata = { title: "Seguridad" };
export default function SecurityPage() { return <main className="p-4 sm:p-6 lg:p-8"><header className="mb-7"><h1 className="text-3xl font-semibold tracking-tight">Seguridad</h1><p className="mt-2 text-sm text-muted-foreground">Administra el acceso a tu cuenta.</p></header><ChangePasswordForm /></main>; }
