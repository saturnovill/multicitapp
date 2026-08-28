import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-violet-600 text-white shadow-sm shadow-violet-600/20">
        <CalendarDays className="size-5" aria-hidden="true" />
      </span>
      <span className="text-lg font-semibold tracking-tight">Multicita</span>
    </div>
  );
}
