import { prisma } from "@/lib/prisma";
import { AppRole, hashPassword, requireAdmin } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    return jsonOk({ users });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    const password = String(body.password || "");
    const role = (body.role === "ADMIN" ? "ADMIN" : "USER") as AppRole;

    if (!email || !name || !password) {
      return jsonError("Nombre, email y contraseña son obligatorios");
    }
    if (password.length < 6) {
      return jsonError("La contraseña debe tener al menos 6 caracteres");
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return jsonError("Ya existe un usuario con ese email");

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash: await hashPassword(password),
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        action: "Usuario",
        details: `${admin.name} creó usuario ${user.email} (${user.role})`,
      },
    });

    return jsonOk({ user }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
