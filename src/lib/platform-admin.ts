import "server-only";

import { eq } from "drizzle-orm";
import { cache } from "react";

import { getDb } from "@/db";
import { appUsers } from "@/db/schema";
import { auth, getAuthSession } from "@/lib/auth/server";

export const getAppUserByAuthId = cache(async (authUserId: string) => {
  const [user] = await getDb()
    .select({
      id: appUsers.id,
      authUserId: appUsers.authUserId,
      name: appUsers.name,
      email: appUsers.email,
      platformRole: appUsers.platformRole,
      isActive: appUsers.isActive,
    })
    .from(appUsers)
    .where(eq(appUsers.authUserId, authUserId))
    .limit(1);

  return user ?? null;
});

export async function getCurrentPlatformAdmin() {
  const { data: session } = await getAuthSession();
  if (!session?.user) return null;

  const appUser = await getAppUserByAuthId(session.user.id);
  if (
    !appUser?.isActive ||
    appUser.platformRole !== "platform_admin"
  ) {
    return null;
  }

  return { session, appUser };
}

export async function requirePlatformAdmin() {
  const { data: session } = await auth.getSession();
  if (!session?.user) throw new Error("No autenticado");

  const [appUser] = await getDb()
    .select({ id: appUsers.id, platformRole: appUsers.platformRole, isActive: appUsers.isActive })
    .from(appUsers)
    .where(eq(appUsers.authUserId, session.user.id))
    .limit(1);

  if (
    !appUser?.isActive ||
    appUser.platformRole !== "platform_admin"
  ) {
    throw new Error("No autorizado");
  }

  return { session, appUser };
}
