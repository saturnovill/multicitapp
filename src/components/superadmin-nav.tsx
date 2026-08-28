"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  MapPin,
  Menu,
  ScrollText,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/app/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/app/admin/empresas", label: "Empresas", icon: Building2 },
  { href: "/app/admin/usuarios", label: "Usuarios", icon: UsersRound },
  { href: "/app/admin/sucursales", label: "Sucursales", icon: MapPin },
  { href: "/app/admin/auditoria", label: "Auditoría", icon: ScrollText },
  { href: "/app/admin/seguridad", label: "Seguridad", icon: ShieldCheck },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1" aria-label="Navegación de superadministración">
      {navigation.map(({ href, label, icon: Icon }) => {
        const active = href === "/app/admin"
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-violet-50 text-violet-800"
                : "text-stone-600 hover:bg-stone-100 hover:text-stone-950",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SuperAdminNav() {
  return <NavLinks />;
}

export function SuperAdminMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Abrir menú">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] gap-0 bg-white p-0">
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="sr-only">Menú de superadministración</SheetTitle>
          <BrandMark />
        </SheetHeader>
        <div className="p-4">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
            Control de plataforma
          </p>
          <NavLinks onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
