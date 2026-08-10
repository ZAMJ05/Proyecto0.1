import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session-cookie";

function logoutResponse(request: Request) {
  const url = new URL("/login", request.url);
  url.searchParams.set("loggedOut", "1");

  // Respuesta JSON para fetch; también sirve redirect para formularios
  const accept = request.headers.get("accept") || "";
  const wantsHtml = accept.includes("text/html");

  const res = wantsHtml
    ? NextResponse.redirect(url, 303)
    : NextResponse.json(
        { ok: true },
        {
          status: 200,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );

  clearSessionCookie(res);
  return res;
}

export async function POST(request: Request) {
  return logoutResponse(request);
}

export async function GET(request: Request) {
  return logoutResponse(request);
}
