import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { addMonths } from "@/lib/constants";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const lifecycle = searchParams.get("lifecycle") === "1";

    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 90);

    const maintenances = await prisma.maintenance.findMany({
      where: lifecycle
        ? undefined
        : {
            completedDate: null,
          },
      orderBy: { scheduledDate: "asc" },
      include: {
        asset: {
          include: {
            assignments: {
              where: { unassignedAt: null },
              include: { employee: true },
            },
          },
        },
      },
    });

    const renewals = await prisma.asset.findMany({
      where: {
        status: { in: ["Activo", "Stock", "Reparacion", "Inactivo"] },
      },
      orderBy: { renewalDate: "asc" },
      include: {
        assignments: {
          where: { unassignedAt: null },
          include: { employee: true },
        },
      },
    });

    const lifecycleItems = renewals.map((asset) => {
      const days =
        Math.ceil(
          (asset.renewalDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
      let renewalStatus = "Vigente";
      if (days < 0) renewalStatus = "Vencido";
      else if (days <= 90) renewalStatus = "Por renovar";

      return {
        ...asset,
        daysToRenewal: days,
        renewalStatus,
      };
    });

    return jsonOk({
      maintenances,
      renewals: lifecycleItems,
      summary: {
        maintenanceDue: maintenances.filter(
          (m) => !m.completedDate && m.scheduledDate <= soon
        ).length,
        renewalsDue: lifecycleItems.filter((r) =>
          ["Vencido", "Por renovar"].includes(r.renewalStatus)
        ).length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const id = String(body.id || "");
    const action = String(body.action || "complete");

    const maintenance = await prisma.maintenance.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!maintenance) return jsonError("Mantenimiento no encontrado", 404);

    if (action === "complete") {
      const completed = await prisma.maintenance.update({
        where: { id },
        data: {
          completedDate: new Date(),
          status: "Completado",
          notes: body.notes || maintenance.notes,
        },
      });

      const nextDate = addMonths(completed.scheduledDate, 6);
      await prisma.maintenance.create({
        data: {
          assetId: maintenance.assetId,
          scheduledDate: nextDate,
          status: "Pendiente",
          notes: "Mantenimiento preventivo cada 6 meses",
        },
      });

      await prisma.activityLog.create({
        data: {
          assetId: maintenance.assetId,
          action: "Mantenimiento",
          details: `Mantenimiento completado para ${maintenance.asset.name}`,
        },
      });

      return jsonOk({ maintenance: completed });
    }

    return jsonError("Acción no válida");
  } catch (error) {
    return handleApiError(error);
  }
}
