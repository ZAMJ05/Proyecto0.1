import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session-cookie";
import { publicUrl } from "@/lib/request-origin";

function logoutResponse(request: Request) {
  const url = publicUrl(request, "/login", "loggedOut=1");

  const accept = request.headers.get("accept") || "";
  const wantsHtml = accept.includes("text/html") || !accept.includes("json");

  const res = wantsHtml
    ? NextResponse.redirect(url, 303)
    : NextResponse.json(
        { ok: true, redirectTo: url.toString() },
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
