import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const history = searchParams.get("history") === "1";
    const employeeId = searchParams.get("employeeId");
    const assetId = searchParams.get("assetId");

    const assignments = await prisma.assignment.findMany({
      where: {
        ...(history ? {} : { unassignedAt: null }),
        ...(employeeId ? { employeeId } : {}),
        ...(assetId ? { assetId } : {}),
      },
      orderBy: { assignedAt: "desc" },
      include: {
        asset: true,
        employee: { include: { position: true } },
      },
    });

    return jsonOk({ assignments });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const assetId = String(body.assetId || "");
    const employeeId = String(body.employeeId || "");
    const notes = body.notes ? String(body.notes) : null;

    if (!assetId || !employeeId) {
      return jsonError("Equipo y usuario son obligatorios");
    }

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) return jsonError("Equipo no encontrado", 404);
    if (asset.status !== "Activo" && asset.status !== "Stock") {
      return jsonError("Solo se pueden asignar equipos en Activo o Stock");
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee || !employee.active) {
      return jsonError("Usuario/empleado no válido");
    }

    const open = await prisma.assignment.findFirst({
      where: { assetId, unassignedAt: null },
    });
    if (open) {
      return jsonError("El equipo ya tiene una asignación activa");
    }

    if (asset.status === "Stock") {
      await prisma.asset.update({
        where: { id: assetId },
        data: { status: "Activo" },
      });
    }

    const assignment = await prisma.assignment.create({
      data: { assetId, employeeId, notes },
      include: {
        asset: true,
        employee: { include: { position: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        assetId,
        action: "Asignación",
        details: `${asset.name} asignado a ${employee.name}`,
      },
    });

    return jsonOk({ assignment }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
