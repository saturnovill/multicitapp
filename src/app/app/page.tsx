import { redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth/server";
import { getTenantContext } from "@/lib/tenant";

export default async function AppPage() {
  const { data: session } = await getAuthSession();
  if (!session?.user) redirect("/login");

  const context = await getTenantContext(session.user.id);
  redirect(context ? "/app/agenda" : "/app/onboarding");
}
