"use client";

import { useActionState } from "react";

import { cancelSaleAction, type SaleActionState } from "@/app/app/sale-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: SaleActionState = { status: "idle" };

export function CancelSaleForm({ saleId, companyId }: { saleId: string; companyId: string }) {
  const [state, action, pending] = useActionState(cancelSaleAction, initialState);
  return <form action={action} className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4"><input type="hidden" name="saleId" value={saleId} /><input type="hidden" name="companyId" value={companyId} /><p className="font-medium text-red-900">Cancelar venta</p><p className="text-sm text-red-700">La venta permanecerá en el historial y en auditoría, pero dejará de sumar en reportes.</p><Input name="reason" minLength={3} maxLength={500} required placeholder="Motivo de cancelación" className="bg-white" />{state.message ? <p role={state.status === "error" ? "alert" : undefined} className="text-sm text-red-800">{state.message}</p> : null}<Button type="submit" variant="destructive" disabled={pending}>{pending ? "Cancelando…" : "Cancelar venta"}</Button></form>;
}
