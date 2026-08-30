"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  CalendarDays,
  ContactRound,
  LayoutDashboard,
  MapPin,
  Settings,
  ChartNoAxesCombined,
  ShoppingCart,
  Landmark,
  Gift,
  Percent,
  UsersRound,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navigation = [
  { href: "/app/citas", label: "Citas", icon: CalendarDays },
  { href: "/app", label: "Resumen", icon: LayoutDashboard },
  { href: "/app/clientes", label: "Clientes", icon: ContactRound },
  { href: "/app/ventas", label: "Ventas", icon: ShoppingCart },
  { href: "/app/caja", label: "Caja", icon: Landmark },
  { href: "/app/giftcards", label: "Gift cards", icon: Gift },
  { href: "/app/comisiones", label: "Comisiones", icon: Percent },
  { href: "/app/reportes", label: "Reportes", icon: ChartNoAxesCombined },
  { href: "/app/empleados", label: "Empleados", icon: UsersRound },
  { href: "/app/servicios", label: "Servicios", icon: BriefcaseBusiness },
  { href: "/app/sucursales", label: "Sucursales", icon: MapPin },
  { href: "/app/seguridad", label: "Seguridad", icon: ShieldCheck },
];

export function AppShellNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1" aria-label="Navegación principal">
      {navigation.map(({ href, label, icon: Icon }) => {
        const active = href === "/app"
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
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
      <Link
        href="/app/configuracion"
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-950"
      >
        <Settings className="size-4" aria-hidden="true" />
        Configuración
      </Link>
    </nav>
  );
}
