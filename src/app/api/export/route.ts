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

function fileStamp(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export async function GET(request: Request) {
  try {
    const session = await requireSession();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const exportedAt = new Date();

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
          include: {
            parent: { select: { id: true, name: true, parentId: true } },
            children: { select: { name: true }, orderBy: { name: "asc" } },
            _count: { select: { employees: true } },
          },
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

    const positionById = new Map(
      positions.map((p) => [
        p.id,
        { id: p.id, name: p.name, parentId: p.parent?.id ?? null },
      ])
    );

    function hierarchyPath(positionId: string | null | undefined): string {
      if (!positionId) return "";
      const parts: string[] = [];
      let cur = positionById.get(positionId);
      const guard = new Set<string>();
      while (cur && !guard.has(cur.id)) {
        parts.unshift(cur.name);
        guard.add(cur.id);
        cur = cur.parentId ? positionById.get(cur.parentId) : undefined;
      }
      return parts.join(" › ");
    }

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
    const assetsTracked = assets.filter((a) => a.status !== "Baja");
    const activeAssignments = assignments.filter((a) => !a.unassignedAt);
    const employeesActive = employees.filter((e) => e.active).length;

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

    const in90 = new Date(exportedAt);
    in90.setDate(in90.getDate() + 90);
    const renewalAssets = laptopsSinBaja.filter(
      (a) =>
        a.renewalDate &&
        a.renewalDate <= in90 &&
        ["Activo", "Stock", "Reparacion"].includes(a.status)
    );
    const renewalsDue = renewalAssets.length;

    const positionsRows = positions.map((p) => ({
      name: p.name,
      hierarchy: hierarchyPath(p.id),
      reportsTo: p.parent?.name || "",
      designates: p.children.map((c) => c.name).join("; "),
      description: p.description || "",
      employees: p._count.employees,
    }));

    const assetsRows = assets.map((a) => ({
      name: a.name,
      category: a.category,
      brand: a.brand,
      model: a.model,
      serialNumber: a.serialNumber,
      inventoryNumber: a.inventoryNumber,
      status: a.status,
      purchaseDate: formatDate(a.purchaseDate),
      renewalDate:
        a.category === "Laptop" ? formatDate(a.renewalDate) : "N/A",
      anydesk: a.category === "Laptop" ? a.anydesk || "" : "N/A",
      assignedTo: a.assignments[0]?.employee.name || "",
      notes: a.notes || "",
    }));

    const stockRows = stockAssets.map((a) => ({
      name: a.name,
      category: a.category,
      brand: a.brand,
      model: a.model,
      serialNumber: a.serialNumber,
      inventoryNumber: a.inventoryNumber,
      purchaseDate: formatDate(a.purchaseDate),
      notes: a.notes || "",
    }));

    const employeeRows = employees.map((e) => ({
      name: e.name,
      email: e.email || "",
      department: e.department || "",
      position: e.position?.name || "",
      status: e.active ? "Trabaja aquí" : "Ya no trabaja aquí",
      assignedCount: e.assignments.length,
      serials: e.assignments.map((a) => a.asset.serialNumber).join(", "),
    }));

    const assignmentRows = assignments.map((a) => ({
      employee: a.employee.name,
      position: a.employee.position?.name || "",
      asset: a.asset.name,
      category: a.asset.category,
      serialNumber: a.asset.serialNumber,
      assignedAt: formatDate(a.assignedAt),
      unassignedAt: a.unassignedAt ? formatDate(a.unassignedAt) : "",
      status: a.unassignedAt ? "Histórica" : "Activa",
      notes: a.notes || "",
    }));

    const maintenanceRows = maintenances.map((m) => ({
      asset: m.asset.name,
      category: m.asset.category,
      serialNumber: m.asset.serialNumber,
      scheduledDate: formatDate(m.scheduledDate),
      status: m.status,
      notes: m.notes || "",
    }));

    const renewalRows = renewalAssets
      .slice()
      .sort(
        (a, b) =>
          (a.renewalDate?.getTime() || 0) - (b.renewalDate?.getTime() || 0)
      )
      .map((a) => ({
        name: a.name,
        serialNumber: a.serialNumber,
        assignedTo: a.assignments[0]?.employee.name || "",
        renewalDate: formatDate(a.renewalDate),
        status: a.status,
      }));

    if (format === "csv") {
      const parts: string[] = [
        tableToCsv(
          "RESUMEN GENERAL",
          ["Concepto", "Cantidad"],
          [
            ["Equipos totales", assets.length],
            ["Equipos sin baja", assetsTracked.length],
            ["Stock / reserva", stockAssets.length],
            ["Usuarios", employees.length],
            ["Usuarios activos", employeesActive],
            ["Asignaciones activas", activeAssignments.length],
            ["Puestos", positions.length],
            ["Renovaciones laptops (90 dias)", renewalsDue],
            ["Mantenimientos pendientes", maintenances.length],
          ]
        ),
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
          assetsRows.map((a) => [
            a.name,
            a.category,
            a.brand,
            a.model,
            a.serialNumber,
            a.inventoryNumber,
            a.status,
            a.purchaseDate,
            a.renewalDate,
            a.anydesk,
            a.assignedTo,
            a.notes,
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
          stockRows.map((a) => [
            a.name,
            a.category,
            a.brand,
            a.model,
            a.serialNumber,
            a.inventoryNumber,
            a.purchaseDate,
            a.notes,
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
          employeeRows.map((e) => [
            e.name,
            e.email,
            e.department,
            e.position,
            e.status,
            e.assignedCount,
            e.serials,
          ])
        ),
        tableToCsv(
          "PUESTOS / ORGANIGRAMA",
          [
            "Puesto",
            "Jerarquia",
            "ReportaA",
            "Designados",
            "Descripcion",
            "Usuarios",
          ],
          positionsRows.map((p) => [
            p.name,
            p.hierarchy,
            p.reportsTo,
            p.designates,
            p.description,
            p.employees,
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
          assignmentRows.map((a) => [
            a.employee,
            a.position,
            a.asset,
            a.category,
            a.serialNumber,
            a.assignedAt,
            a.unassignedAt,
            a.status,
            a.notes,
          ])
        ),
        tableToCsv(
          "RENOVACIONES LAPTOPS (90 DIAS)",
          ["Equipo", "Serial", "AsignadoA", "FechaRenovacion", "Estado"],
          renewalRows.map((r) => [
            r.name,
            r.serialNumber,
            r.assignedTo,
            r.renewalDate,
            r.status,
          ])
        ),
        tableToCsv(
          "MANTENIMIENTOS PENDIENTES",
          ["Equipo", "Categoria", "Serial", "Programado", "Estado", "Notas"],
          maintenanceRows.map((m) => [
            m.asset,
            m.category,
            m.serialNumber,
            m.scheduledDate,
            m.status,
            m.notes,
          ])
        ),
      ];

      const csv = `\uFEFF${parts.join("\n")}`;
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="assetdesk-inventario-${fileStamp(exportedAt)}.csv"`,
        },
      });
    }

    return Response.json({
      exportedAt: exportedAt.toISOString(),
      exportedBy: session.name || session.email || "",
      summary: {
        totalAssets: assets.length,
        assetsTracked: assetsTracked.length,
        stock: stockAssets.length,
        employees: employees.length,
        employeesActive,
        activeAssignments: activeAssignments.length,
        positions: positions.length,
        pendingMaintenances: maintenances.length,
        renewalsDue,
        laptops: laptopsSummary,
      },
      charts: {
        byCategory,
        byStatus,
        laptopsByStatus,
      },
      tables: {
        assets: assetsRows,
        stock: stockRows,
        employees: employeeRows,
        positions: positionsRows,
        assignments: assignmentRows,
        maintenances: maintenanceRows,
        renewals: renewalRows,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
