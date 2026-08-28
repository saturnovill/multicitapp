import { redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth/server";
import { getAppUserByAuthId } from "@/lib/platform-admin";
import { getTenantContext } from "@/lib/tenant";

export default async function AppPage() {
  const { data: session } = await getAuthSession();
  if (!session?.user) redirect("/login");

  const appUser = await getAppUserByAuthId(session.user.id);
  if (appUser?.platformRole === "platform_admin" && appUser.isActive) {
    redirect("/app/admin");
  }

  const context = await getTenantContext(session.user.id);
  redirect(context ? "/app/agenda" : "/app/sin-acceso");
}
