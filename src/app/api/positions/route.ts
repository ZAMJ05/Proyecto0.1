import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    await requireSession();
    const positions = await prisma.position.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { employees: true } },
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

    const position = await prisma.position.create({
      data: { name, description },
    });
    return jsonOk({ position }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
