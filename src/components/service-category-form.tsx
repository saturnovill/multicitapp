"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { FolderPlus, LoaderCircle, Save } from "lucide-react";

import { saveCategoryAction, type ServiceActionState } from "@/app/app/service-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Company = { id: string; name: string };
type Category = { id: string; companyId: string; name: string; status: "active" | "inactive" };
const initialState: ServiceActionState = { status: "idle" };

function CreateSubmit() {
  const { pending } = useFormStatus();
  return <Button type="submit" variant="outline" className="w-full" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" /> : <FolderPlus />}Crear categoría</Button>;
}

function EditCategoryForm({ category }: { category: Category }) {
  const [state, action] = useActionState(saveCategoryAction, initialState);
  return (
    <form action={action} className="space-y-2 rounded-lg border p-3">
      <input type="hidden" name="categoryId" value={category.id} />
      <input type="hidden" name="companyId" value={category.companyId} />
      <div className="flex items-center justify-between gap-2">
        <Badge variant={category.status === "active" ? "secondary" : "outline"}>{category.status === "active" ? "Activa" : "Inactiva"}</Badge>
        <Button type="submit" size="icon-sm" variant="ghost" aria-label={`Guardar ${category.name}`}><Save /></Button>
      </div>
      <Input name="name" defaultValue={category.name} required maxLength={120} aria-label="Nombre de categoría" />
      <select name="status" defaultValue={category.status} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" aria-label="Estado de categoría"><option value="active">Activa</option><option value="inactive">Inactiva</option></select>
      {state.status !== "idle" ? <p role="status" className={state.status === "success" ? "text-xs text-emerald-700" : "text-xs text-red-700"}>{state.message}</p> : null}
    </form>
  );
}

export function ServiceCategoryForm({ companies, categories, fixedCompanyId }: { companies: Company[]; categories: Category[]; fixedCompanyId?: string }) {
  const [state, action] = useActionState(saveCategoryAction, initialState);
  const [companyId, setCompanyId] = useState(fixedCompanyId ?? "");
  const visibleCategories = useMemo(() => categories.filter((category) => category.companyId === companyId), [categories, companyId]);

  return (
    <Card>
      <CardHeader><CardTitle>Categorías</CardTitle><CardDescription>Crea, renombra o desactiva agrupaciones del catálogo.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        <form action={action} className="space-y-4">
          <input type="hidden" name="categoryId" value="" />
          <input type="hidden" name="status" value="active" />
          {fixedCompanyId ? <input type="hidden" name="companyId" value={fixedCompanyId} /> : <div className="space-y-2"><Label htmlFor="categoryCompany">Empresa</Label><select id="categoryCompany" name="companyId" required value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"><option value="" disabled>Seleccionar</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></div>}
          <div className="space-y-2"><Label htmlFor="categoryName">Nueva categoría</Label><Input id="categoryName" name="name" required maxLength={120} /></div>
          {state.status !== "idle" ? <p role="status" className={state.status === "success" ? "text-sm text-emerald-700" : "text-sm text-red-700"}>{state.message}</p> : null}
          <CreateSubmit />
        </form>
        {visibleCategories.length ? <div className="space-y-2 border-t pt-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Categorías existentes</p>{visibleCategories.map((category) => <EditCategoryForm key={category.id} category={category} />)}</div> : companyId ? <p className="border-t pt-4 text-sm text-muted-foreground">Aún no hay categorías en esta empresa.</p> : null}
      </CardContent>
    </Card>
  );
}
