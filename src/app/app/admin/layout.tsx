import type { ReactNode } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/brand-mark";
import {
  SuperAdminMobileNav,
  SuperAdminNav,
} from "@/components/superadmin-nav";
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
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-stone-200 bg-white lg:flex lg:flex-col">
        <div className="border-b px-5 py-4">
          <BrandMark />
          <span className="mt-4 flex w-fit items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Superadministración
          </span>
        </div>
        <div className="flex-1 p-4">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400">
            Plataforma
          </p>
          <SuperAdminNav />
        </div>
        <div className="border-t p-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <Avatar className="size-8">
              <AvatarFallback className="bg-violet-100 text-xs font-semibold text-violet-800">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-none">
                {admin.session.user.name}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">Superadministrador</p>
            </div>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="ghost" className="w-full justify-start gap-3">
                <LogOut className="size-4" />
                Cerrar sesión
              </Button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-stone-200/80 bg-white/90 px-4 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2">
            <SuperAdminMobileNav />
            <span className="text-sm font-semibold">Superadministración</span>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="icon" aria-label="Cerrar sesión">
              <LogOut className="size-4" />
            </Button>
          </form>
        </header>
        {children}
      </div>
    </div>
  );
}
