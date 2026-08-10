import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { handleApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";

    const assets = await prisma.asset.findMany({
      orderBy: { name: "asc" },
      include: {
        assignments: {
          where: { unassignedAt: null },
          include: { employee: true },
        },
      },
    });

    if (format === "csv") {
      const header = [
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
      ];
      const rows = assets.map((a) => [
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
        (a.notes || "").replace(/"/g, '""'),
      ]);
      const csv = [header, ...rows]
        .map((r) => r.map((c) => `"${c}"`).join(","))
        .join("\n");

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="inventario.csv"',
        },
      });
    }

    // JSON for client-side PDF generation
    return Response.json({
      exportedAt: new Date().toISOString(),
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
    });
  } catch (error) {
    return handleApiError(error);
  }
}
