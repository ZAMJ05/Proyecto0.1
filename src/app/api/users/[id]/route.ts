import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

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
