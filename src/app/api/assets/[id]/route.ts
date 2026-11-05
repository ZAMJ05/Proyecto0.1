import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { addYears, ASSET_CATEGORIES, ASSET_STATUSES } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        assignments: {
          orderBy: { assignedAt: "desc" },
          include: { employee: { include: { position: true } } },
        },
        maintenances: { orderBy: { scheduledDate: "desc" } },
        activityLogs: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!asset) return jsonError("Equipo no encontrado", 404);
    return jsonOk({ asset });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) return jsonError("Equipo no encontrado", 404);

    const body = await request.json();
    const name = String(body.name || "").trim();
    const category = String(body.category || "");
    const brand = String(body.brand || "").trim();
    const model = String(body.model || "").trim();
    const serialNumber = String(body.serialNumber || "").trim();
    const inventoryNumber = String(body.inventoryNumber || "").trim();
    const status = String(body.status || "");
    const purchaseDate = new Date(body.purchaseDate);
    const notes = body.notes ? String(body.notes) : null;
    let anydesk = body.anydesk ? String(body.anydesk).trim() : null;

    if (!name || !category || !brand || !model || !serialNumber || !inventoryNumber) {
      return jsonError("Faltan campos obligatorios");
    }
    if (!(ASSET_CATEGORIES as readonly string[]).includes(category)) {
      return jsonError("Categoría inválida");
    }
    if (!(ASSET_STATUSES as readonly string[]).includes(status)) {
      return jsonError("Estado inválido");
    }
    if (status === "Reparacion" && category !== "Laptop") {
      return jsonError("Reparación solo aplica a laptops");
    }
    if (Number.isNaN(purchaseDate.getTime())) {
      return jsonError("Fecha de compra inválida");
    }
    if (!(category === "Laptop" && status === "Activo")) anydesk = null;

    let renewalDate: Date | null = null;
    if (category === "Laptop") {
      renewalDate = body.renewalDate
        ? new Date(body.renewalDate)
        : addYears(purchaseDate, 4);
      if (Number.isNaN(renewalDate.getTime())) {
        return jsonError("Fecha de renovación inválida");
      }
    }

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        name,
        category,
        brand,
        model,
        serialNumber,
        inventoryNumber,
        status,
        purchaseDate,
        renewalDate,
        anydesk,
        notes,
      },
    });

    await prisma.activityLog.create({
      data: {
        assetId: asset.id,
        action: "Actualización",
        details: `Equipo ${asset.name} actualizado (estado: ${asset.status})`,
      },
    });

    return jsonOk({ asset });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const existing = await prisma.asset.findUnique({ where: { id } });
    if (!existing) return jsonError("Equipo no encontrado", 404);

    await prisma.asset.delete({ where: { id } });
    await prisma.activityLog.create({
      data: {
        action: "Eliminación",
        details: `Equipo ${existing.name} (${existing.serialNumber}) eliminado`,
      },
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
