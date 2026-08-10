export const SESSION_COOKIE_NAME = "it_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas

export function sessionCookieOptions(maxAge: number) {
  const secure = process.env.COOKIE_SECURE === "true";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge,
  };
}

type CookieResponder = {
  cookies: {
    set: (
      name: string,
      value: string,
      options?: Record<string, unknown>
    ) => unknown;
    delete: (args: { name: string; path?: string }) => unknown;
  };
};

/** Borra la cookie en la respuesta HTTP (forma confiable en Route Handlers). */
export function clearSessionCookie<T extends CookieResponder>(res: T): T {
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(0),
    maxAge: 0,
    expires: new Date(0),
  });
  res.cookies.delete({
    name: SESSION_COOKIE_NAME,
    path: "/",
  });
  return res;
}
