"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";

import { deleteEmployeeExceptionAction, type EmployeeActionState } from "@/app/app/employee-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const initialState: EmployeeActionState = { status: "idle" };

export function ExceptionDeleteButton({ companyId, employeeId, exceptionId }: { companyId: string; employeeId: string; exceptionId: string }) {
  const [state, action, pending] = useActionState(deleteEmployeeExceptionAction, initialState);

  return (
    <div className="shrink-0">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Eliminar bloqueo">
            <Trash2 />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este bloqueo?</AlertDialogTitle>
            <AlertDialogDescription>
              El periodo volverá a quedar disponible para recibir citas. Esta acción quedará registrada en la auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form action={action}>
            <input type="hidden" name="companyId" value={companyId} />
            <input type="hidden" name="employeeId" value={employeeId} />
            <input type="hidden" name="exceptionId" value={exceptionId} />
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Conservar</AlertDialogCancel>
              <AlertDialogAction type="submit" variant="destructive" disabled={pending}>
                {pending ? "Eliminando…" : "Eliminar bloqueo"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
      {state.status === "error" ? <span className="sr-only" role="alert">{state.message}</span> : null}
    </div>
  );
}
