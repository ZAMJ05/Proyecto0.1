import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { asset: true, employee: true },
    });
    if (!assignment) return jsonError("Asignación no encontrada", 404);
    if (assignment.unassignedAt) {
      return jsonError("La asignación ya fue cerrada");
    }

    const updated = await prisma.assignment.update({
      where: { id },
      data: {
        unassignedAt: new Date(),
        notes: body.notes
          ? `${assignment.notes || ""}${assignment.notes ? " | " : ""}${body.notes}`
          : assignment.notes,
      },
      include: {
        asset: true,
        employee: { include: { position: true } },
      },
    });

    const keepStatus =
      assignment.asset.status === "Activo" || assignment.asset.status === "Stock";
    await prisma.activityLog.create({
      data: {
        assetId: assignment.assetId,
        action: "Desasignación",
        details: keepStatus
          ? `${assignment.asset.name} liberado de ${assignment.employee.name}. Conserva el estado ${assignment.asset.status} y queda disponible en Stock para volver a asignarse.`
          : `${assignment.asset.name} liberado de ${assignment.employee.name}`,
      },
    });

    return jsonOk({ assignment: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
