import Link from "next/link";
import { ArrowRight, Building2, MapPin, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export type BranchSelectionOption = {
  id: string;
  name: string;
  companyName: string;
  employeeCount: number;
  timezone: string;
  href: string;
};

export function BranchSelector({ branches }: { branches: BranchSelectionOption[] }) {
  if (branches.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="grid min-h-64 place-items-center p-8 text-center">
          <div>
            <MapPin className="mx-auto size-8 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-4 font-semibold">No hay sucursales disponibles</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea o activa una sucursal antes de consultar sus citas.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {branches.map((branch) => (
        <Link key={branch.id} href={branch.href} className="group outline-none">
          <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:ring-violet-300 group-focus-visible:ring-2 group-focus-visible:ring-violet-500">
            <CardContent className="flex h-full items-start gap-4 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700">
                <MapPin className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{branch.name}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="size-3.5" aria-hidden="true" />
                      {branch.companyName}
                    </p>
                  </div>
                  <ArrowRight className="mt-0.5 size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-violet-700" aria-hidden="true" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    <UsersRound aria-hidden="true" />
                    {branch.employeeCount} empleados
                  </Badge>
                  <Badge variant="outline">{branch.timezone}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
