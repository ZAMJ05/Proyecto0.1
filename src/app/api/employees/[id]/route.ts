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
    const name = String(body.name || "").trim();
    if (!name) return jsonError("El nombre es obligatorio");

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        name,
        email: body.email ? String(body.email).trim().toLowerCase() : null,
        department: body.department ? String(body.department).trim() : null,
        positionId: body.positionId || null,
        active: body.active !== false,
      },
      include: { position: true },
    });

    return jsonOk({ employee });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.employee.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
