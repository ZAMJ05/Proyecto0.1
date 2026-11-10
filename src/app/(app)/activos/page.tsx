"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Select,
  statusTone,
} from "@/components/ui";
import {
  AssetPreview,
  AssetPreviewButton,
  type AssetListItem,
} from "@/components/AssetPreview";
import { AssetEditModal } from "@/components/AssetEditModal";
import { CopyableValue } from "@/components/CopyableValue";
import { ListFooter, ListToolbar } from "@/components/ListToolbar";
import { SortableTh } from "@/components/SortableTh";
import { useListControls } from "@/hooks/useListControls";
import {
  ASSET_SEARCH_PLACEHOLDER,
  assetSearchText,
} from "@/lib/asset-search";
import { ASSET_CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

function ActivosContent() {
  const searchParams = useSearchParams();
  const [assets, setAssets] = useState<AssetListItem[]>([]);
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [unassignedOnly, setUnassignedOnly] = useState(
    searchParams.get("unassigned") === "1"
  );

  async function load() {
    setLoading(true);
    const [assetsRes, meRes] = await Promise.all([
      fetch("/api/assets?status=Activo"),
      fetch("/api/auth/me"),
    ]);
    const assetsData = await assetsRes.json();
    const meData = await meRes.json();
    setAssets(assetsData.assets || []);
    setRole(meData.user?.role || "USER");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    return assets.filter((asset) => {
      if (category && asset.category !== category) return false;
      if (unassignedOnly && asset.assignments.length > 0) return false;
      return true;
    });
  }, [assets, category, unassignedOnly]);

  const list = useListControls(visible, {
    storageKey: "activos-p50",
    defaultView: "list",
    getName: (a) => assetSearchText(a),
    defaultSortKey: "name",
    sortFields: {
      name: { label: "Nombre", getValue: (a) => a.name },
      brand: { label: "Marca", getValue: (a) => a.brand },
      category: { label: "Categoría", getValue: (a) => a.category },
      serial: { label: "Serial", getValue: (a) => a.serialNumber },
      assigned: {
        label: "Asignado",
        getValue: (a) => a.assignments[0]?.employee.name || "",
      },
      purchase: {
        label: "Compra",
        getValue: (a) => new Date(a.purchaseDate).getTime(),
      },
      renewal: {
        label: "Renovación",
        getValue: (a) =>
          a.category === "Laptop" && a.renewalDate
            ? new Date(a.renewalDate).getTime()
            : 0,
      },
      anydesk: { label: "AnyDesk", getValue: (a) => a.anydesk || "" },
    },
  });

  async function removeAsset(id: string) {
    if (!confirm("¿Eliminar este equipo del inventario?")) return;
    const res = await fetch(`/api/assets/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo eliminar");
      return;
    }
    if (previewId === id) setPreviewId(null);
    await load();
  }

  return (
    <div>
      <PageHeader
        module="Consulta · Inventario"
        title="Equipos activos"
        subtitle="Solo estado Activo. Para laptops y monitores con asignación usa Laptops y monitores."
      />

      <ListToolbar
        extra={
          <>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Categoría"
              className="w-full min-h-10"
            >
              <option value="">Categoría</option>
              {ASSET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c] || c}
                </option>
              ))}
            </Select>
            <Select
              value={unassignedOnly ? "1" : ""}
              onChange={(e) => setUnassignedOnly(e.target.value === "1")}
              aria-label="Asignación"
              className="w-full min-h-10"
            >
              <option value="">Asignación</option>
              <option value="1">Sin asignar</option>
            </Select>
          </>
        }
        name={list.name}
        onNameChange={list.setName}
        view={list.view}
        onViewChange={list.setView}
        page={list.page}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        showingFrom={list.showingFrom}
        showingTo={list.showingTo}
        total={list.total}
        namePlaceholder={ASSET_SEARCH_PLACEHOLDER}
        sortOptions={list.sortOptions}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onSortChange={list.setSort}
      />

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Cargando equipos activos...</p>
      ) : list.total === 0 ? (
        <EmptyState text="No hay equipos activos con estos filtros." />
      ) : list.view === "list" ? (
        <div className="table-shell">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr>
                <SortableTh
                  label="Equipo"
                  columnKey="name"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                />
                <SortableTh
                  label="Categoría"
                  columnKey="category"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                  className="hide-phone"
                />
                <SortableTh
                  label="Serial / Inv."
                  columnKey="serial"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                />
                <SortableTh
                  label="Asignado"
                  columnKey="assigned"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                />
                <SortableTh
                  label="Compra / Renov."
                  columnKey="purchase"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                  className="hide-narrow"
                />
                <SortableTh
                  label="AnyDesk"
                  columnKey="anydesk"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                  className="hide-narrow"
                />
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {list.pageItems.map((asset) => (
                <tr
                  key={asset.id}
                  className="border-t border-[var(--border)] cursor-pointer"
                  onClick={() => setPreviewId(asset.id)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{asset.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {asset.brand} {asset.model}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--muted)] sm:hidden">
                      {CATEGORY_LABELS[asset.category] || asset.category}
                    </p>
                  </td>
                  <td className="hide-phone px-4 py-3">
                    {CATEGORY_LABELS[asset.category] || asset.category}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-[13px]">{asset.serialNumber}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {asset.inventoryNumber}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {asset.assignments[0]?.employee.name || (
                      <span className="text-[var(--muted)]">Sin asignar</span>
                    )}
                  </td>
                  <td className="hide-narrow px-4 py-3">
                    <p>{formatDate(asset.purchaseDate)}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {asset.category === "Laptop"
                        ? formatDate(asset.renewalDate)
                        : "—"}
                    </p>
                  </td>
                  <td className="hide-narrow px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {asset.category === "Laptop" ? (
                      <CopyableValue value={asset.anydesk} label="Copiar AnyDesk" />
                    ) : (
                      <span className="text-xs text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="row-actions">
                      <AssetPreviewButton onClick={() => setPreviewId(asset.id)} />
                      {role === "ADMIN" && (
                        <>
                          <Button
                            variant="secondary"
                            className="px-2 py-1"
                            title="Editar"
                            onClick={() => setEditId(asset.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="danger"
                            className="px-2 py-1"
                            onClick={() => removeAsset(asset.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.pageItems.map((asset) => (
            <Card
              key={asset.id}
              onClick={() => setPreviewId(asset.id)}
              className="animate-rise"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{asset.name}</h3>
                  <p className="text-sm text-[var(--muted)]">
                    {asset.brand} {asset.model}
                  </p>
                </div>
                <Badge tone={statusTone(asset.status)}>{asset.status}</Badge>
              </div>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--muted)]">Categoría</dt>
                  <dd>{CATEGORY_LABELS[asset.category] || asset.category}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--muted)]">Serial</dt>
                  <dd className="font-mono text-xs">{asset.serialNumber}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--muted)]">Asignado</dt>
                  <dd>
                    {asset.assignments[0]?.employee.name || "Sin asignar"}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-[var(--accent-strong)]">
                Clic para vista previa
              </p>
            </Card>
          ))}
        </div>
      )}

      <ListFooter
        page={list.page}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        showingFrom={list.showingFrom}
        showingTo={list.showingTo}
        total={list.total}
      />

      <AssetPreview
        assetId={previewId}
        onClose={() => setPreviewId(null)}
        onSaved={load}
      />
      {editId && (
        <AssetEditModal
          assetId={editId}
          onClose={() => setEditId(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

export default function ActivosPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-[var(--muted)]">Cargando...</p>}
    >
      <ActivosContent />
    </Suspense>
  );
}
