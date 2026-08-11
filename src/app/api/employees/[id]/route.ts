import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        position: true,
        assignments: {
          orderBy: { assignedAt: "desc" },
          include: { asset: true },
        },
      },
    });
    if (!employee) return jsonError("Empleado no encontrado", 404);
    return jsonOk({ employee });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) return jsonError("Usuario no encontrado", 404);

    const name = String(body.name ?? existing.name).trim();
    if (!name) return jsonError("El nombre es obligatorio");

    const nextActive =
      typeof body.active === "boolean" ? body.active : body.active !== false;
    const releaseAssets = body.releaseAssets !== false;
    const wasActive = existing.active;

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        name,
        email:
          body.email !== undefined
            ? body.email
              ? String(body.email).trim().toLowerCase()
              : null
            : existing.email,
        department:
          body.department !== undefined
            ? body.department
              ? String(body.department).trim()
              : null
            : existing.department,
        positionId:
          body.positionId !== undefined
            ? body.positionId || null
            : existing.positionId,
        active: nextActive,
      },
      include: { position: true },
    });

    let releasedCount = 0;

    // Si pasa a "ya no trabaja aquí", liberar equipos y devolverlos a Stock
    if (wasActive && !nextActive && releaseAssets) {
      const open = await prisma.assignment.findMany({
        where: { employeeId: id, unassignedAt: null },
        include: { asset: true },
      });
      const now = new Date();
      for (const a of open) {
        await prisma.assignment.update({
          where: { id: a.id },
          data: {
            unassignedAt: now,
            notes: a.notes
              ? `${a.notes} · Liberado por baja de usuario`
              : "Liberado por baja de usuario (ya no trabaja aquí)",
          },
        });
        if (a.asset.status === "Activo") {
          await prisma.asset.update({
            where: { id: a.assetId },
            data: { status: "Stock" },
          });
        }
        await prisma.activityLog.create({
          data: {
            assetId: a.assetId,
            action: "Liberación",
            details: `${a.asset.name} liberado de ${employee.name} (usuario ya no trabaja aquí)`,
          },
        });
        releasedCount += 1;
      }
    }

    await prisma.activityLog.create({
      data: {
        action: "Usuario inventario",
        details: !wasActive && nextActive
          ? `Se reactivó al usuario ${employee.name} (vuelve a trabajar aquí)`
          : wasActive && !nextActive
            ? `Usuario ${employee.name} marcado como “ya no trabaja aquí”${
                releasedCount
                  ? ` · ${releasedCount} equipo(s) liberado(s)`
                  : ""
              }`
            : `Se actualizó el usuario ${employee.name}`,
      },
    });

    return jsonOk({ employee, releasedCount });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return jsonError("Usuario no encontrado", 404);

    const activeAssignments = await prisma.assignment.count({
      where: { employeeId: id, unassignedAt: null },
    });
    if (activeAssignments > 0) {
      return jsonError(
        "Este usuario tiene equipos asignados. Márcalo como “ya no trabaja aquí” (libera equipos) o libéralos en Asignaciones antes de eliminarlo.",
        400
      );
    }

    await prisma.employee.delete({ where: { id } });
    await prisma.activityLog.create({
      data: {
        action: "Usuario inventario",
        details: `Se eliminó el usuario ${employee.name}`,
      },
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
