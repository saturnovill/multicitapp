import { redirect } from "next/navigation";

export default async function LegacyAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const { date } = await searchParams;
  const selectedDate = typeof date === "string" ? date : undefined;
  redirect(selectedDate ? `/app/citas?date=${encodeURIComponent(selectedDate)}` : "/app/citas");
}
