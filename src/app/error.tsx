"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[ui:error-boundary]", error); }, [error]);
  return <main className="grid min-h-[70svh] place-items-center p-6"><div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm"><p className="text-xs font-semibold uppercase tracking-widest text-violet-700">Error inesperado</p><h1 className="mt-3 text-2xl font-semibold">No pudimos cargar esta sección</h1><p className="mt-2 text-sm text-muted-foreground">Tus datos no se modificaron. Puedes volver a intentar la operación.</p><Button className="mt-6" onClick={reset}>Intentar de nuevo</Button>{error.digest ? <p className="mt-4 text-xs text-muted-foreground">Referencia: {error.digest}</p> : null}</div></main>;
}
