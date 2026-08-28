import type { ReactNode } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth/server";
import { getCurrentPlatformAdmin } from "@/lib/platform-admin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getCurrentPlatformAdmin();
  if (!admin) redirect("/app");

  async function signOut() {
    "use server";
    await auth.signOut();
    redirect("/login");
  }

  const initials = admin.session.user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-svh bg-[#f8f7fa]">
      <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-5">
            <BrandMark />
            <span className="hidden items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 sm:flex">
              <ShieldCheck className="size-3.5" />
              Superadministración
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarFallback className="bg-violet-100 text-xs font-semibold text-violet-800">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="text-sm font-medium leading-none">
                {admin.session.user.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Superadministrador
              </p>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="icon" aria-label="Cerrar sesión">
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
