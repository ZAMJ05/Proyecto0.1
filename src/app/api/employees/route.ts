import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    await requireSession();
    const employees = await prisma.employee.findMany({
      orderBy: { name: "asc" },
      include: {
        position: true,
        assignments: {
          where: { unassignedAt: null },
          include: { asset: true },
        },
      },
    });
    return jsonOk({ employees });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = body.email ? String(body.email).trim().toLowerCase() : null;
    const department = body.department ? String(body.department).trim() : null;
    const positionId = body.positionId || null;

    if (!name) return jsonError("El nombre es obligatorio");

    const employee = await prisma.employee.create({
      data: { name, email, department, positionId, active: true },
      include: { position: true },
    });

    return jsonOk({ employee }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
