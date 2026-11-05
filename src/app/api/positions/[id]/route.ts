import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

async function wouldCreateCycle(
  positionId: string,
  newParentId: string,
): Promise<boolean> {
  if (positionId === newParentId) return true;
  let current: string | null = newParentId;
  const visited = new Set<string>();
  while (current) {
    if (current === positionId) return true;
    if (visited.has(current)) return true;
    visited.add(current);
    const node: { parentId: string | null } | null =
      await prisma.position.findUnique({
        where: { id: current },
        select: { parentId: true },
      });
    current = node?.parentId ?? null;
  }
  return false;
}

export async function PUT(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const existing = await prisma.position.findUnique({ where: { id } });
    if (!existing) return jsonError("Puesto no encontrado", 404);

    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name) return jsonError("El nombre del puesto es obligatorio");

    let parentId: string | null | undefined = undefined;
    if (body.parentId !== undefined) {
      if (body.parentId === null || body.parentId === "") {
        parentId = null;
      } else {
        const candidate = String(body.parentId);
        const parent = await prisma.position.findUnique({
          where: { id: candidate },
        });
        if (!parent) return jsonError("Puesto superior no encontrado", 404);
        if (await wouldCreateCycle(id, candidate)) {
          return jsonError(
            "No se puede asignar ese superior: crearía un ciclo en el organigrama",
          );
        }
        parentId = candidate;
      }
    }

    const position = await prisma.position.update({
      where: { id },
      data: {
        name,
        description: body.description
          ? String(body.description).trim()
          : null,
        ...(parentId !== undefined ? { parentId } : {}),
      },
      include: {
        parent: { select: { id: true, name: true } },
        children: {
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
        _count: { select: { employees: true, children: true } },
        employees: {
          select: { id: true, name: true, email: true, active: true },
        },
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
    // Children become roots (schema also uses onDelete: SetNull)
    await prisma.position.updateMany({
      where: { parentId: id },
      data: { parentId: null },
    });
    await prisma.position.delete({ where: { id } });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
