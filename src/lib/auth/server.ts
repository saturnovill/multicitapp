import "server-only";

import { createNeonAuth } from "@neondatabase/auth/next/server";
import { cache } from "react";

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

if (!baseUrl || !cookieSecret) {
  throw new Error(
    "NEON_AUTH_BASE_URL y NEON_AUTH_COOKIE_SECRET deben estar configuradas",
  );
}

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
    sessionDataTtl: 300,
  },
});

export const getAuthSession = cache(() => auth.getSession());
