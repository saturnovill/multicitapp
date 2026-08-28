import { auth } from "@/lib/auth/server";

const handlers = auth.handler();

type AuthRouteContext = {
  params: Promise<{ path: string[] }>;
};

export const { GET, PUT, DELETE, PATCH } = handlers;

export async function POST(request: Request, context: AuthRouteContext) {
  const { path } = await context.params;

  if (path.join("/") === "sign-up/email") {
    return Response.json(
      { message: "El registro público está deshabilitado" },
      { status: 403 },
    );
  }

  return handlers.POST(request, context);
}
