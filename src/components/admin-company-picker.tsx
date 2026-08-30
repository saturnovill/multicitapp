import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AdminCompanyPicker({ companies, selectedId }: { companies: { id: string; name: string }[]; selectedId?: string }) { return <Card className="mb-6"><CardContent><form className="flex flex-col gap-3 sm:flex-row"><select name="companyId" defaultValue={selectedId ?? ""} required className="h-9 min-w-72 rounded-lg border border-input bg-white px-3 text-sm"><option value="">Selecciona una empresa</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select><Button>Continuar</Button></form></CardContent></Card>; }
