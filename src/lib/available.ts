import { Prisma } from "@prisma/client";

/**
 * Equipos que se pueden volver a asignar:
 * estado Stock, o Activo sin asignación abierta.
 * Liberar un equipo no cambia Activo → Stock.
 */
export function availableForAssignmentWhere(): Prisma.AssetWhereInput {
  return {
    OR: [
      { status: "Stock" },
      {
        status: "Activo",
        assignments: { none: { unassignedAt: null } },
      },
    ],
  };
}

export function isAvailableForAssignment(asset: {
  status: string;
  assignments?: Array<{ unassignedAt: Date | string | null }>;
}) {
  if (asset.status === "Stock") return true;
  if (asset.status !== "Activo") return false;
  return !(asset.assignments || []).some((a) => !a.unassignedAt);
}
