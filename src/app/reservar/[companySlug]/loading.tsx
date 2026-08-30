import { Skeleton } from "@/components/ui/skeleton";

export default function PublicBookingLoading() {
  return <main className="min-h-svh bg-stone-50/70"><div className="mx-auto max-w-7xl space-y-6 px-5 py-14 sm:px-8"><Skeleton className="h-10 w-72" /><Skeleton className="h-5 w-full max-w-xl" /><div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"><Skeleton className="h-[620px] rounded-xl" /><Skeleton className="h-80 rounded-xl" /></div></div></main>;
}
