import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShellNav } from "@/components/app-shell-nav";
import { BrandMark } from "@/components/brand-mark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { auth, getAuthSession } from "@/lib/auth/server";
import { getTenantContext } from "@/lib/tenant";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { data: session } = await getAuthSession();
  if (!session?.user) redirect("/login");

  const context = await getTenantContext(session.user.id);
  if (!context) redirect("/app/sin-acceso");

  async function signOut() {
    "use server";
    await auth.signOut();
    redirect("/login");
  }

  const initials = session.user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-svh bg-[#f8f7fa] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden border-r border-stone-200/80 bg-white lg:fixed lg:inset-y-0 lg:flex lg:w-[248px] lg:flex-col">
        <div className="flex h-20 items-center px-6">
          <BrandMark />
        </div>
        <div className="px-4">
          <div className="mb-5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-3">
            <p className="truncate text-sm font-semibold">{context.companyName}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {context.role === "manager"
                ? "Todas las sucursales"
                : context.branch?.name ?? "Sin sucursal"}
            </p>
          </div>
          <AppShellNav />
        </div>
        <div className="mt-auto p-4">
          <Separator className="mb-4" />
          <div className="flex items-center gap-3 px-2">
            <Avatar className="size-9">
              <AvatarFallback className="bg-violet-100 text-xs font-semibold text-violet-800">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{session.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {context.role}
              </p>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="icon" aria-label="Cerrar sesión">
                <LogOut className="size-4" aria-hidden="true" />
              </Button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 lg:col-start-2">{children}</main>
    </div>
  );
}
