import { prisma } from "@/lib/prisma";
import { AppRole, hashPassword, requireAdmin } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return jsonError("Usuario no encontrado", 404);

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const role = (body.role === "ADMIN" ? "ADMIN" : "USER") as AppRole;
    const password = body.password ? String(body.password) : "";

    if (!name || !email) {
      return jsonError("Nombre y email son obligatorios");
    }
    if (password && password.length < 6) {
      return jsonError("La contraseña debe tener al menos 6 caracteres");
    }

    if (email !== existing.email) {
      const taken = await prisma.user.findUnique({ where: { email } });
      if (taken) {
        return jsonError(
          `Usuario duplicado: el email "${email}" ya pertenece a ${taken.name}.`,
          409
        );
      }
    }

    if (existing.role === "ADMIN" && role === "USER") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return jsonError("Debe existir al menos un administrador");
      }
    }

    if (id === admin.id && role !== "ADMIN") {
      return jsonError("No puedes quitarte el rol de administrador");
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
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
        details: `${admin.name} actualizó acceso ${user.email} (${user.role})${
          password ? " [contraseña cambiada]" : ""
        }`,
      },
    });

    return jsonOk({ user });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    if (id === admin.id) {
      return jsonError("No puedes eliminar tu propio usuario");
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return jsonError("Usuario no encontrado", 404);

    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (user.role === "ADMIN" && adminCount <= 1) {
      return jsonError("Debe existir al menos un administrador");
    }

    await prisma.user.delete({ where: { id } });
    await prisma.activityLog.create({
      data: {
        action: "Usuario",
        details: `${admin.name} eliminó usuario ${user.email}`,
      },
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
