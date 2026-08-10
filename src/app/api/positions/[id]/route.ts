import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name) return jsonError("El nombre del puesto es obligatorio");

    const position = await prisma.position.update({
      where: { id },
      data: {
        name,
        description: body.description
          ? String(body.description).trim()
          : null,
      },
    });
    return jsonOk({ position });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.employee.updateMany({
      where: { positionId: id },
      data: { positionId: null },
    });
    await prisma.position.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
