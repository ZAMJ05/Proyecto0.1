import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import {
  addMonths,
  addYears,
  ASSET_CATEGORIES,
  ASSET_STATUSES,
  supportsQuantity,
} from "@/lib/constants";

function withIndex(base: string, index: number, total: number) {
  if (total <= 1) return base;
  const pad = String(index).padStart(Math.max(2, String(total).length), "0");
  return `${base}-${pad}`;
}

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

    const rawQty = Number(body.quantity ?? 1);
    const quantity = supportsQuantity(category)
      ? Math.max(1, Math.min(100, Number.isFinite(rawQty) ? Math.floor(rawQty) : 1))
      : 1;

    const planned = Array.from({ length: quantity }, (_, i) => ({
      serialNumber: withIndex(serialNumber, i + 1, quantity),
      inventoryNumber: withIndex(inventoryNumber, i + 1, quantity),
    }));

    const serials = planned.map((p) => p.serialNumber);
    const inventories = planned.map((p) => p.inventoryNumber);

    const conflicts = await prisma.asset.findMany({
      where: {
        OR: [
          { serialNumber: { in: serials } },
          { inventoryNumber: { in: inventories } },
        ],
      },
      select: { serialNumber: true, inventoryNumber: true },
    });
    if (conflicts.length > 0) {
      const detail = conflicts
        .map((c) => `${c.serialNumber}/${c.inventoryNumber}`)
        .slice(0, 5)
        .join(", ");
      return jsonError(
        `Ya existen serial o inventario en conflicto: ${detail}`,
        400
      );
    }

    const created = [];
    for (let i = 0; i < quantity; i++) {
      const asset = await prisma.asset.create({
        data: {
          name: quantity > 1 ? `${name} (${i + 1}/${quantity})` : name,
          category,
          brand,
          model,
          serialNumber: planned[i].serialNumber,
          inventoryNumber: planned[i].inventoryNumber,
          status,
          purchaseDate,
          renewalDate,
          anydesk: quantity > 1 ? null : anydesk,
          notes,
        },
      });
      created.push(asset);

      await prisma.activityLog.create({
        data: {
          assetId: asset.id,
          action: "Alta",
          details:
            quantity > 1
              ? `Equipo ${asset.name} dado de alta (${asset.status}) · lote ${i + 1}/${quantity}`
              : `Equipo ${asset.name} dado de alta (${asset.status})`,
        },
      });

      if (category === "Laptop") {
        await prisma.maintenance.create({
          data: {
            assetId: asset.id,
            scheduledDate: addMonths(purchaseDate, 6),
            status: "Pendiente",
            notes: "Mantenimiento preventivo cada 6 meses (laptops)",
          },
        });
      }
    }

    return jsonOk(
      {
        asset: created[0],
        assets: created,
        createdCount: created.length,
      },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
