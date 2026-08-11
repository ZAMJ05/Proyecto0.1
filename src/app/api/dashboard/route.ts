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
      laptopsActive,
      laptopsInactive,
      laptopsStock,
      laptopsReparacion,
    ] = await Promise.all([
      prisma.asset.count({ where: { status: { not: "Baja" } } }),
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
      prisma.asset.groupBy({
        by: ["category"],
        where: { status: { not: "Baja" } },
        _count: { _all: true },
      }),
      prisma.asset.groupBy({
        by: ["status"],
        where: { status: { not: "Baja" } },
        _count: { _all: true },
      }),
      prisma.asset.count({
        where: { category: "Laptop", status: "Activo" },
      }),
      prisma.asset.count({
        where: { category: "Laptop", status: "Inactivo" },
      }),
      prisma.asset.count({
        where: { category: "Laptop", status: "Stock" },
      }),
      prisma.asset.count({
        where: { category: "Laptop", status: "Reparacion" },
      }),
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

    const disabled = inactive;

    const now = new Date();
    const in90 = new Date();
    in90.setDate(in90.getDate() + 90);

    const renewalsDue = await prisma.asset.count({
      where: {
        category: "Laptop",
        status: { in: ["Activo", "Stock", "Reparacion"] },
        renewalDate: { lte: in90 },
      },
    });

    const maintenancesDue = await prisma.maintenance.count({
      where: {
        status: { in: ["Pendiente", "Próximo"] },
        scheduledDate: { lte: in90 },
        completedDate: null,
        asset: {
          category: "Laptop",
          status: { in: ["Activo", "Stock", "Reparacion"] },
        },
      },
    });

    return jsonOk({
      cards: {
        active,
        recentChanges: recentChangesCount,
        activeUnassigned,
        total,
        disabled,
        baja,
        stock,
        reparacion,
        renewalsDue,
        maintenancesDue,
        laptops: {
          active: laptopsActive,
          inactive: laptopsInactive,
          stock: laptopsStock,
          reparacion: laptopsReparacion,
          tracked: laptopsActive + laptopsInactive + laptopsStock + laptopsReparacion,
        },
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
        laptopsByStatus: [
          { name: "Activas", value: laptopsActive },
          { name: "Inactivas", value: laptopsInactive },
          { name: "Stock", value: laptopsStock },
          { name: "Reparación", value: laptopsReparacion },
        ].filter((x) => x.value > 0),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
