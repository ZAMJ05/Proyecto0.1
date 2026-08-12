import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    await requireSession();
    const positions = await prisma.position.findMany({
      orderBy: { name: "asc" },
      include: {
        parent: { select: { id: true, name: true } },
        children: {
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
        _count: { select: { employees: true, children: true } },
        employees: {
          select: {
            id: true,
            name: true,
            email: true,
            active: true,
          },
        },
      },
    });
    return jsonOk({ positions });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const name = String(body.name || "").trim();
    const description = body.description
      ? String(body.description).trim()
      : null;
    if (!name) return jsonError("El nombre del puesto es obligatorio");

    let parentId: string | null = null;
    if (body.parentId) {
      const parent = await prisma.position.findUnique({
        where: { id: String(body.parentId) },
      });
      if (!parent) return jsonError("Puesto superior no encontrado", 404);
      parentId = parent.id;
    }

    const position = await prisma.position.create({
      data: { name, description, parentId },
      include: {
        parent: { select: { id: true, name: true } },
        children: { select: { id: true, name: true } },
        _count: { select: { employees: true, children: true } },
        employees: {
          select: { id: true, name: true, email: true, active: true },
        },
      },
    });
    return jsonOk({ position }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
