import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getAuthSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { data: session } = await getAuthSession();
  if (!session?.user) redirect("/login");

  return children;
}
