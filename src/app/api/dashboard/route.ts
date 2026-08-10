import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    await requireSession();

    const [
      total,
      active,
      stock,
      inactive,
      baja,
      reparacion,
      recentChangesCount,
      recentChanges,
      byCategory,
      byStatus,
    ] = await Promise.all([
      prisma.asset.count(),
      prisma.asset.count({ where: { status: "Activo" } }),
      prisma.asset.count({ where: { status: "Stock" } }),
      prisma.asset.count({ where: { status: "Inactivo" } }),
      prisma.asset.count({ where: { status: "Baja" } }),
      prisma.asset.count({ where: { status: "Reparacion" } }),
      prisma.activityLog.count(),
      prisma.activityLog.findMany({
        take: 200,
        orderBy: { createdAt: "desc" },
        include: { asset: { select: { name: true, serialNumber: true } } },
      }),
      prisma.asset.groupBy({ by: ["category"], _count: { _all: true } }),
      prisma.asset.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);

    const activeAssets = await prisma.asset.findMany({
      where: { status: "Activo" },
      include: {
        assignments: {
          where: { unassignedAt: null },
          select: { id: true },
        },
      },
    });

    const activeUnassigned = activeAssets.filter(
      (a) => a.assignments.length === 0
    ).length;

    const disabled = inactive + baja;

    const now = new Date();
    const in90 = new Date();
    in90.setDate(in90.getDate() + 90);

    const renewalsDue = await prisma.asset.count({
      where: {
        status: { in: ["Activo", "Stock", "Reparacion"] },
        renewalDate: { lte: in90 },
      },
    });

    const maintenancesDue = await prisma.maintenance.count({
      where: {
        status: { in: ["Pendiente", "Próximo"] },
        scheduledDate: { lte: in90 },
        completedDate: null,
      },
    });

    return jsonOk({
      cards: {
        active,
        recentChanges: recentChangesCount,
        activeUnassigned,
        total,
        disabled,
        stock,
        reparacion,
        renewalsDue,
        maintenancesDue,
      },
      recentChanges,
      charts: {
        byCategory: byCategory.map((c) => ({
          name: c.category,
          value: c._count._all,
        })),
        byStatus: byStatus.map((s) => ({
          name: s.status,
          value: s._count._all,
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
