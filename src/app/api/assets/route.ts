import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import {
  addMonths,
  addYears,
  ASSET_CATEGORIES,
  ASSET_STATUSES,
} from "@/lib/constants";

function buildWhere(searchParams: URLSearchParams): Prisma.AssetWhereInput {
  const where: Prisma.AssetWhereInput = {};
  const q = searchParams.get("q")?.trim();
  const category = searchParams.get("category");
  const status = searchParams.get("status");
  const brand = searchParams.get("brand")?.trim();
  const model = searchParams.get("model")?.trim();
  const serialNumber = searchParams.get("serialNumber")?.trim();
  const inventoryNumber = searchParams.get("inventoryNumber")?.trim();
  const anydesk = searchParams.get("anydesk")?.trim();
  const employee = searchParams.get("employee")?.trim();
  const stockOnly = searchParams.get("stockOnly");
  const unassigned = searchParams.get("unassigned");

  if (stockOnly === "1") where.status = "Stock";
  else if (status && (ASSET_STATUSES as readonly string[]).includes(status)) {
    where.status = status;
  }

  if (category && (ASSET_CATEGORIES as readonly string[]).includes(category)) {
    where.category = category;
  }
  if (brand) where.brand = { contains: brand };
  if (model) where.model = { contains: model };
  if (serialNumber) where.serialNumber = { contains: serialNumber };
  if (inventoryNumber) where.inventoryNumber = { contains: inventoryNumber };
  if (anydesk) where.anydesk = { contains: anydesk };

  if (q) {
    where.OR = [
      { name: { contains: q } },
      { brand: { contains: q } },
      { model: { contains: q } },
      { serialNumber: { contains: q } },
      { inventoryNumber: { contains: q } },
      { anydesk: { contains: q } },
      { notes: { contains: q } },
      {
        assignments: {
          some: {
            unassignedAt: null,
            employee: {
              OR: [
                { name: { contains: q } },
                { email: { contains: q } },
              ],
            },
          },
        },
      },
    ];
  }

  if (employee) {
    where.assignments = {
      some: {
        unassignedAt: null,
        employee: {
          OR: [
            { name: { contains: employee } },
            { email: { contains: employee } },
          ],
        },
      },
    };
  }

  if (unassigned === "1") {
    where.assignments = { none: { unassignedAt: null } };
    if (!where.status) where.status = "Activo";
  }

  return where;
}

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const where = buildWhere(searchParams);

    const assets = await prisma.asset.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        assignments: {
          where: { unassignedAt: null },
          include: {
            employee: {
              include: { position: true },
            },
          },
        },
      },
    });

    return jsonOk({ assets });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();

    const name = String(body.name || "").trim();
    const category = String(body.category || "");
    const brand = String(body.brand || "").trim();
    const model = String(body.model || "").trim();
    const serialNumber = String(body.serialNumber || "").trim();
    const inventoryNumber = String(body.inventoryNumber || "").trim();
    const status = String(body.status || "Stock");
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
    if (!(category === "Laptop" && status === "Activo")) {
      anydesk = null;
    }

    const renewalDate = body.renewalDate
      ? new Date(body.renewalDate)
      : addYears(purchaseDate, 4);

    const asset = await prisma.asset.create({
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
        action: "Alta",
        details: `Equipo ${asset.name} dado de alta (${asset.status})`,
      },
    });

    if (["Laptop", "Monitor", "MeetingBar"].includes(category)) {
      await prisma.maintenance.create({
        data: {
          assetId: asset.id,
          scheduledDate: addMonths(purchaseDate, 6),
          status: "Pendiente",
          notes: "Mantenimiento preventivo cada 6 meses",
        },
      });
    }

    return jsonOk({ asset }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
