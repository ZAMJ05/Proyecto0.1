import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/session-cookie";

const publicPaths = ["/login", "/api/auth/login", "/api/auth/logout"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  const loggedOut = request.nextUrl.searchParams.get("loggedOut") === "1";

  // Tras cerrar sesión, fuerza borrado de cookie aunque el cliente la reenvie
  if (pathname === "/login" && loggedOut) {
    const res = NextResponse.next();
    res.cookies.set(SESSION_COOKIE_NAME, "", {
      ...sessionCookieOptions(0),
      maxAge: 0,
      expires: new Date(0),
    });
    return res;
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || "dev-secret"
  );

  let valid = false;
  if (token && !loggedOut) {
    try {
      await jwtVerify(token, secret);
      valid = true;
    } catch {
      valid = false;
    }
  }

  if (!valid && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (valid && pathname === "/login" && !loggedOut) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = valid ? "/dashboard" : "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
