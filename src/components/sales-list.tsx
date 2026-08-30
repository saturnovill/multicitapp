import Link from "next/link";
import { Eye, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Branch } from "@/db/schema";
import { getSales, type SaleListFilters } from "@/lib/sales-data";

export async function SalesList({ companyId, basePath, filters, branches, showCompany = false, newHref }: { companyId?: string; basePath: string; filters: SaleListFilters; branches: Pick<Branch, "id" | "name">[]; showCompany?: boolean; newHref: string }) {
  const rows = await getSales(companyId, filters);
  return <div className="space-y-5">
    <div className="flex justify-end"><Button asChild><Link href={newHref}><Plus />Nueva venta</Link></Button></div>
    <Card><CardContent><form className="grid gap-3 md:grid-cols-[1fr_1fr_1.5fr_auto_auto]"><Input type="date" name="from" defaultValue={filters.from} aria-label="Desde" /><Input type="date" name="to" defaultValue={filters.to} aria-label="Hasta" /><select name="branchId" defaultValue={filters.branchId ?? ""} className="h-9 rounded-lg border border-input bg-white px-3 text-sm"><option value="">Todas las sucursales</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><Button type="submit"><Search />Filtrar</Button><Button variant="outline" asChild><Link href={basePath}>Limpiar</Link></Button></form></CardContent></Card>
    <div className="overflow-hidden rounded-xl border bg-white"><Table><TableHeader><TableRow><TableHead>Folio</TableHead><TableHead>Fecha</TableHead>{showCompany ? <TableHead>Empresa</TableHead> : null}<TableHead>Sucursal</TableHead><TableHead>Cliente</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="w-16" /></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.folio}</TableCell><TableCell className="whitespace-nowrap">{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(row.createdAt)}</TableCell>{showCompany ? <TableCell>{row.companyName}</TableCell> : null}<TableCell>{row.branchName}</TableCell><TableCell>{row.customerName ?? "Público general"}</TableCell><TableCell><Badge variant={row.status === "cancelled" ? "outline" : "secondary"}>{row.status === "cancelled" ? "Cancelada" : "Completada"}</Badge></TableCell><TableCell className="text-right font-medium">{new Intl.NumberFormat("es-MX", { style: "currency", currency: row.currency }).format(row.totalCents / 100)}</TableCell><TableCell><Button size="icon" variant="ghost" asChild><Link href={`${basePath}/${row.id}`} aria-label={`Ver ${row.folio}`}><Eye /></Link></Button></TableCell></TableRow>)}{rows.length === 0 ? <TableRow><TableCell colSpan={showCompany ? 8 : 7} className="h-32 text-center text-muted-foreground">Aún no hay ventas con estos filtros.</TableCell></TableRow> : null}</TableBody></Table></div>
  </div>;
}
