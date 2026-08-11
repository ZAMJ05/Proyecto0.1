import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";

function csvEscape(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function tableToCsv(title: string, headers: string[], rows: unknown[][]) {
  const lines = [
    csvEscape(`### ${title}`),
    headers.map(csvEscape).join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
    "",
  ];
  return lines.join("\n");
}

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";

    const [assets, employees, positions, assignments, maintenances] =
      await Promise.all([
        prisma.asset.findMany({
          orderBy: [{ category: "asc" }, { name: "asc" }],
          include: {
            assignments: {
              where: { unassignedAt: null },
              include: { employee: true },
            },
          },
        }),
        prisma.employee.findMany({
          orderBy: { name: "asc" },
          include: {
            position: true,
            assignments: {
              where: { unassignedAt: null },
              include: { asset: true },
            },
          },
        }),
        prisma.position.findMany({
          orderBy: { name: "asc" },
          include: { _count: { select: { employees: true } } },
        }),
        prisma.assignment.findMany({
          orderBy: { assignedAt: "desc" },
          include: {
            asset: true,
            employee: { include: { position: true } },
          },
        }),
        prisma.maintenance.findMany({
          where: { completedDate: null },
          orderBy: { scheduledDate: "asc" },
          include: { asset: true },
          take: 500,
        }),
      ]);

    const byCategoryMap = new Map<string, number>();
    const byStatusMap = new Map<string, number>();
    for (const a of assets) {
      byCategoryMap.set(a.category, (byCategoryMap.get(a.category) || 0) + 1);
      byStatusMap.set(a.status, (byStatusMap.get(a.status) || 0) + 1);
    }
    const byCategory = [...byCategoryMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const byStatus = [...byStatusMap.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const stockAssets = assets.filter((a) => a.status === "Stock");
    const activeAssignments = assignments.filter((a) => !a.unassignedAt);

    const laptops = assets.filter((a) => a.category === "Laptop");
    const laptopsSinBaja = laptops.filter((a) => a.status !== "Baja");
    const laptopsActive = laptops.filter((a) => a.status === "Activo").length;
    const laptopsInactive = laptops.filter((a) => a.status === "Inactivo").length;
    const laptopsStock = laptops.filter((a) => a.status === "Stock").length;
    const laptopsReparacion = laptops.filter(
      (a) => a.status === "Reparacion"
    ).length;
    const laptopsSummary = {
      total: laptopsSinBaja.length,
      activas: laptopsActive,
      inactivas: laptopsInactive,
      stock: laptopsStock,
      reparacion: laptopsReparacion,
    };
    const laptopsByStatus = [
      { name: "Activas", value: laptopsActive },
      { name: "Inactivas", value: laptopsInactive },
      { name: "Stock", value: laptopsStock },
      { name: "Reparación", value: laptopsReparacion },
    ].filter((x) => x.value > 0);

    if (format === "csv") {
      const parts: string[] = [
        tableToCsv(
          "RESUMEN LAPTOPS (sin bajas)",
          ["Concepto", "Cantidad"],
          [
            ["Total laptops", laptopsSummary.total],
            ["Activas", laptopsSummary.activas],
            ["Inactivas", laptopsSummary.inactivas],
            ["En stock", laptopsSummary.stock],
            ["En reparacion", laptopsSummary.reparacion],
          ]
        ),
        tableToCsv(
          "RESUMEN POR CATEGORIA",
          ["Categoria", "Cantidad"],
          byCategory.map((r) => [r.name, r.value])
        ),
        tableToCsv(
          "RESUMEN POR ESTADO",
          ["Estado", "Cantidad"],
          byStatus.map((r) => [r.name, r.value])
        ),
        tableToCsv(
          "INVENTARIO",
          [
            "Nombre",
            "Categoria",
            "Marca",
            "Modelo",
            "Serial",
            "Inventario",
            "Estado",
            "FechaCompra",
            "FechaRenovacion",
            "AnyDesk",
            "AsignadoA",
            "Notas",
          ],
          assets.map((a) => [
            a.name,
            a.category,
            a.brand,
            a.model,
            a.serialNumber,
            a.inventoryNumber,
            a.status,
            formatDate(a.purchaseDate),
            formatDate(a.renewalDate),
            a.anydesk || "",
            a.assignments[0]?.employee.name || "",
            a.notes || "",
          ])
        ),
        tableToCsv(
          "STOCK / RESERVA",
          [
            "Nombre",
            "Categoria",
            "Marca",
            "Modelo",
            "Serial",
            "Inventario",
            "FechaCompra",
            "Notas",
          ],
          stockAssets.map((a) => [
            a.name,
            a.category,
            a.brand,
            a.model,
            a.serialNumber,
            a.inventoryNumber,
            formatDate(a.purchaseDate),
            a.notes || "",
          ])
        ),
        tableToCsv(
          "EMPLEADOS / USUARIOS-ACTIVOS",
          [
            "Nombre",
            "Email",
            "Departamento",
            "Puesto",
            "EstadoLaboral",
            "EquiposAsignados",
            "Seriales",
          ],
          employees.map((e) => [
            e.name,
            e.email || "",
            e.department || "",
            e.position?.name || "",
            e.active ? "Trabaja aqui" : "Ya no trabaja aqui",
            e.assignments.length,
            e.assignments.map((a) => a.asset.serialNumber).join(" | "),
          ])
        ),
        tableToCsv(
          "PUESTOS",
          ["Puesto", "Descripcion", "Usuarios"],
          positions.map((p) => [
            p.name,
            p.description || "",
            p._count.employees,
          ])
        ),
        tableToCsv(
          "ASIGNACIONES",
          [
            "Usuario",
            "Puesto",
            "Equipo",
            "Categoria",
            "Serial",
            "AsignadoDesde",
            "Liberado",
            "Estado",
            "Notas",
          ],
          assignments.map((a) => [
            a.employee.name,
            a.employee.position?.name || "",
            a.asset.name,
            a.asset.category,
            a.asset.serialNumber,
            formatDate(a.assignedAt),
            a.unassignedAt ? formatDate(a.unassignedAt) : "",
            a.unassignedAt ? "Historica" : "Activa",
            a.notes || "",
          ])
        ),
        tableToCsv(
          "MANTENIMIENTOS PENDIENTES",
          ["Equipo", "Categoria", "Serial", "Programado", "Estado", "Notas"],
          maintenances.map((m) => [
            m.asset.name,
            m.asset.category,
            m.asset.serialNumber,
            formatDate(m.scheduledDate),
            m.status,
            m.notes || "",
          ])
        ),
      ];

      const csv = `\uFEFF${parts.join("\n")}`;
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="assetdesk-inventario-completo.csv"',
        },
      });
    }

    return Response.json({
      exportedAt: new Date().toISOString(),
      summary: {
        totalAssets: assets.length,
        stock: stockAssets.length,
        employees: employees.length,
        activeAssignments: activeAssignments.length,
        positions: positions.length,
        pendingMaintenances: maintenances.length,
        laptops: laptopsSummary,
      },
      charts: {
        byCategory,
        byStatus,
        laptopsByStatus,
      },
      tables: {
        assets: assets.map((a) => ({
          name: a.name,
          category: a.category,
          brand: a.brand,
          model: a.model,
          serialNumber: a.serialNumber,
          inventoryNumber: a.inventoryNumber,
          status: a.status,
          purchaseDate: formatDate(a.purchaseDate),
          renewalDate: formatDate(a.renewalDate),
          anydesk: a.anydesk || "",
          assignedTo: a.assignments[0]?.employee.name || "",
          notes: a.notes || "",
        })),
        stock: stockAssets.map((a) => ({
          name: a.name,
          category: a.category,
          brand: a.brand,
          model: a.model,
          serialNumber: a.serialNumber,
          inventoryNumber: a.inventoryNumber,
          purchaseDate: formatDate(a.purchaseDate),
          notes: a.notes || "",
        })),
        employees: employees.map((e) => ({
          name: e.name,
          email: e.email || "",
          department: e.department || "",
          position: e.position?.name || "",
          active: e.active,
          assignedCount: e.assignments.length,
          serials: e.assignments.map((a) => a.asset.serialNumber).join(", "),
        })),
        positions: positions.map((p) => ({
          name: p.name,
          description: p.description || "",
          employees: p._count.employees,
        })),
        assignments: assignments.map((a) => ({
          employee: a.employee.name,
          position: a.employee.position?.name || "",
          asset: a.asset.name,
          category: a.asset.category,
          serialNumber: a.asset.serialNumber,
          assignedAt: formatDate(a.assignedAt),
          unassignedAt: a.unassignedAt ? formatDate(a.unassignedAt) : "",
          status: a.unassignedAt ? "Historica" : "Activa",
          notes: a.notes || "",
        })),
        maintenances: maintenances.map((m) => ({
          asset: m.asset.name,
          category: m.asset.category,
          serialNumber: m.asset.serialNumber,
          scheduledDate: formatDate(m.scheduledDate),
          status: m.status,
          notes: m.notes || "",
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
