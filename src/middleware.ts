import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
} from "@/lib/session-cookie";
import { publicUrl } from "@/lib/request-origin";

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
    return NextResponse.redirect(publicUrl(request, "/login"));
  }

  if (valid && pathname === "/login" && !loggedOut) {
    return NextResponse.redirect(publicUrl(request, "/dashboard"));
  }

  if (pathname === "/") {
    return NextResponse.redirect(
      publicUrl(request, valid ? "/dashboard" : "/login")
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
