/** Placeholder único para la barra de búsqueda de equipos. */
export const ASSET_SEARCH_PLACEHOLDER =
  "Buscar por nombre, marca, modelo, serie, inventario o usuario...";

/** Texto unificado para la barra de búsqueda de equipos. */
export function assetSearchText(asset: {
  name?: string | null;
  brand?: string | null;
  model?: string | null;
  category?: string | null;
  serialNumber?: string | null;
  inventoryNumber?: string | null;
  status?: string | null;
  anydesk?: string | null;
  notes?: string | null;
  assignments?: Array<{
    employee?: {
      name?: string | null;
      email?: string | null;
    } | null;
  }>;
}) {
  const assignee = asset.assignments?.[0]?.employee;
  return [
    asset.name,
    asset.brand,
    asset.model,
    asset.category,
    asset.serialNumber,
    asset.inventoryNumber,
    asset.status,
    asset.anydesk,
    asset.notes,
    assignee?.name,
    assignee?.email,
  ]
    .filter(Boolean)
    .join(" ");
}

/** Todas las palabras de la consulta deben aparecer en el texto. */
export function matchesSearchQuery(haystack: string, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const blob = haystack.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length <= 1) return blob.includes(q);
  return tokens.every((token) => blob.includes(token));
}
