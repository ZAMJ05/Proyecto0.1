import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { addMonths } from "@/lib/constants";

/** Laptops que siguen en seguimiento de ciclo de vida (no inactivas ni baja) */
const LIFECYCLE_STATUSES = ["Activo", "Stock", "Reparacion"] as const;

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const lifecycle = searchParams.get("lifecycle") === "1";

    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 90);

    const maintenances = await prisma.maintenance.findMany({
      where: {
        ...(lifecycle
          ? {}
          : {
              completedDate: null,
            }),
        asset: {
          category: "Laptop",
          status: { in: [...LIFECYCLE_STATUSES] },
        },
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
        category: "Laptop",
        status: { in: [...LIFECYCLE_STATUSES] },
        renewalDate: { not: null },
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
      const renewal = asset.renewalDate!;
      const days = Math.ceil(
        (renewal.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
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
    const action = String(body.action || "complete");

    if (action === "confirmInactive") {
      const assetId = String(body.assetId || "");
      if (!assetId) return jsonError("Falta el equipo");

      const asset = await prisma.asset.findUnique({ where: { id: assetId } });
      if (!asset) return jsonError("Equipo no encontrado", 404);
      if (asset.category !== "Laptop") {
        return jsonError("Solo aplica a laptops", 400);
      }

      const now = new Date();
      if (!asset.renewalDate || asset.renewalDate >= now) {
        return jsonError(
          "Solo se pueden confirmar como inactivas las renovaciones vencidas",
          400
        );
      }

      const updated = await prisma.asset.update({
        where: { id: assetId },
        data: {
          status: "Inactivo",
          anydesk: null,
        },
      });

      // Liberar asignaciones abiertas
      const open = await prisma.assignment.findMany({
        where: { assetId, unassignedAt: null },
      });
      for (const a of open) {
        await prisma.assignment.update({
          where: { id: a.id },
          data: {
            unassignedAt: now,
            notes: a.notes
              ? `${a.notes} · Liberado al confirmar renovación vencida`
              : "Liberado al confirmar renovación vencida como inactiva",
          },
        });
      }

      // Cerrar mantenimientos pendientes (ya no aplican a inactivas)
      await prisma.maintenance.updateMany({
        where: {
          assetId,
          completedDate: null,
        },
        data: {
          completedDate: now,
          status: "Completado",
          notes: "Cerrado: laptop confirmada como inactiva (renovación vencida)",
        },
      });

      await prisma.activityLog.create({
        data: {
          assetId,
          action: "Renovación",
          details: `Renovación vencida de ${asset.name} confirmada como inactiva · ya no aparece en ciclo de vida`,
        },
      });

      return jsonOk({ asset: updated });
    }

    const id = String(body.id || "");
    const maintenance = await prisma.maintenance.findUnique({
      where: { id },
      include: { asset: true },
    });
    if (!maintenance) return jsonError("Mantenimiento no encontrado", 404);
    if (maintenance.asset.category !== "Laptop") {
      return jsonError("El mantenimiento solo aplica a laptops", 400);
    }
    if (maintenance.asset.status === "Inactivo" || maintenance.asset.status === "Baja") {
      return jsonError(
        "Las laptops inactivas o de baja no requieren mantenimiento",
        400
      );
    }

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
          notes: "Mantenimiento preventivo cada 6 meses (laptops)",
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
