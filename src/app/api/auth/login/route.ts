import { login } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email || !password) {
      return jsonError("Email y contraseña son requeridos");
    }
    const user = await login(email, password);
    if (!user) return jsonError("Credenciales inválidas", 401);
    return jsonOk({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
