import { z } from "zod";

import { getPublicBookingAvailability } from "@/lib/public-booking";

const querySchema = z.object({
  companySlug: z.string().trim().min(1).max(100),
  branchId: z.uuid(),
  employeeId: z.union([z.uuid(), z.literal("any")]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceIds: z.array(z.uuid()).min(1).max(20),
});

export async function GET(request: Request, { params }: { params: Promise<{ companySlug: string }> }) {
  const { companySlug } = await params;
  const searchParams = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    companySlug,
    branchId: searchParams.get("branchId"),
    employeeId: searchParams.get("employeeId"),
    date: searchParams.get("date"),
    serviceIds: Array.from(new Set(searchParams.getAll("serviceId"))),
  });
  if (!parsed.success) return Response.json({ slots: [], error: "La consulta de horarios no es válida" }, { status: 400, headers: { "Cache-Control": "no-store" } });

  try {
    const result = await getPublicBookingAvailability(parsed.data);
    return Response.json(result, { status: result.error ? 400 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[public-booking:availability] failed", { companySlug, error: String(error) });
    return Response.json({ slots: [], error: "No fue posible consultar los horarios" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
