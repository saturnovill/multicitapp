import { auth } from "@/lib/auth/server";
import { checkLoginRateLimit, recordLoginResult } from "@/lib/auth-rate-limit";
import { getDb } from "@/db";
import { appUsers, auditLogs, companyMemberships } from "@/db/schema";
import { eq } from "drizzle-orm";

const handlers = auth.handler();

type AuthRouteContext = {
  params: Promise<{ path: string[] }>;
};

export const { GET, PUT, DELETE, PATCH } = handlers;

export async function POST(request: Request, context: AuthRouteContext) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ message: "Origen no permitido" }, { status: 403 });

  if (endpoint === "sign-up/email") {
    return Response.json(
      { message: "El registro público está deshabilitado" },
      { status: 403 },
    );
  }

  if (endpoint !== "sign-in/email") return handlers.POST(request, context);
  const payload = await request.clone().json().catch(() => ({})) as { email?: string };
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
  const limit = await checkLoginRateLimit(`${ip}:${payload.email ?? "unknown"}`);
  if (limit.blocked) return Response.json({ message: "Demasiados intentos. Inténtalo más tarde." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  const response = await handlers.POST(request, context);
  await recordLoginResult(limit.keyHash, response.ok);
  const email = payload.email?.trim().toLowerCase();
  if (email) {
    const [knownUser] = await getDb().select({ id: appUsers.id, companyId: companyMemberships.companyId }).from(appUsers).innerJoin(companyMemberships, eq(companyMemberships.userId, appUsers.id)).where(eq(appUsers.email, email)).limit(1);
    if (knownUser) await getDb().insert(auditLogs).values({ companyId: knownUser.companyId, actorUserId: response.ok ? knownUser.id : null, action: response.ok ? "auth.login.succeeded" : "auth.login.failed", entityType: "app_user", entityId: knownUser.id, metadata: { ipHash: limit.keyHash.slice(0, 16) } });
  }
  return response;
}
