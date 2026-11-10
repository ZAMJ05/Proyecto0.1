"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import {
  AssetPreview,
  AssetPreviewButton,
  type AssetListItem,
} from "@/components/AssetPreview";
import { AssetEditModal } from "@/components/AssetEditModal";
import { ListFooter, ListToolbar } from "@/components/ListToolbar";
import { SortableTh } from "@/components/SortableTh";
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  statusTone,
} from "@/components/ui";
import { useListControls } from "@/hooks/useListControls";
import {
  ASSET_SEARCH_PLACEHOLDER,
  assetSearchText,
} from "@/lib/asset-search";

type Vista = "activas" | "inactivas" | "monitores";

const VISTAS: Array<{ id: Vista; label: string }> = [
  { id: "activas", label: "Laptops activas" },
  { id: "inactivas", label: "Laptops inactivas" },
  { id: "monitores", label: "Monitores" },
];

function assignee(asset: AssetListItem) {
  return asset.assignments[0]?.employee.name || "";
}

export default function EquiposPage() {
  const [laptops, setLaptops] = useState<AssetListItem[]>([]);
  const [monitors, setMonitors] = useState<AssetListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState<Vista>("activas");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");

  async function load() {
    setLoading(true);
    const [laptopRes, monitorRes, meRes] = await Promise.all([
      fetch("/api/assets?category=Laptop"),
      fetch("/api/assets?category=Monitor"),
      fetch("/api/auth/me"),
    ]);
    const [laptopData, monitorData, meData] = await Promise.all([
      laptopRes.json(),
      monitorRes.json(),
      meRes.json(),
    ]);
    setLaptops(laptopData.assets || []);
    setMonitors(monitorData.assets || []);
    setRole(meData.user?.role || "USER");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const counts = useMemo(
    () => ({
      activas: laptops.filter((asset) => asset.status === "Activo").length,
      inactivas: laptops.filter((asset) => asset.status !== "Activo").length,
      monitores: monitors.length,
    }),
    [laptops, monitors]
  );

  const visible = useMemo(() => {
    if (vista === "activas")
      return laptops.filter((asset) => asset.status === "Activo");
    if (vista === "inactivas")
      return laptops.filter((asset) => asset.status !== "Activo");
    return monitors;
  }, [vista, laptops, monitors]);

  const list = useListControls(visible, {
    storageKey: "equipos-consulta",
    defaultView: "list",
    getName: (asset) => assetSearchText(asset),
    defaultSortKey: "assigned",
    sortFields: {
      name: { label: "Equipo", getValue: (asset) => asset.name },
      brand: { label: "Marca", getValue: (asset) => asset.brand },
      serial: { label: "Serie", getValue: (asset) => asset.serialNumber },
      status: { label: "Estado", getValue: (asset) => asset.status },
      assigned: { label: "Asignado", getValue: (asset) => assignee(asset) },
    },
  });

  const hint =
    vista === "inactivas"
      ? "Laptops que no están activas: almacén (Stock), inactivas, reparación o baja. El estado real está en cada fila."
      : vista === "monitores"
        ? "Cada monitor con la persona que lo tiene asignado."
        : "Laptops en estado Activo, con la persona asignada.";

  return (
    <div>
      <PageHeader
        module="Consulta · Inventario"
        title="Laptops y monitores"
        subtitle="Lista separada del inventario completo. Solo equipos de cómputo y monitores, con su asignación."
      />

      <div className="mb-3 flex flex-wrap gap-1.5">
        {VISTAS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="sn-chip"
            data-active={vista === item.id}
            onClick={() => setVista(item.id)}
          >
            {item.label}
            <span className="text-[var(--muted)]">({counts[item.id]})</span>
          </button>
        ))}
      </div>
      <p className="mb-3 text-xs text-[var(--muted)]">{hint}</p>

      <ListToolbar
        name={list.name}
        onNameChange={list.setName}
        view={list.view}
        onViewChange={list.setView}
        showingFrom={list.showingFrom}
        showingTo={list.showingTo}
        total={list.total}
        namePlaceholder={ASSET_SEARCH_PLACEHOLDER}
      />

      {loading ? (
        <p className="text-sm text-[var(--muted)]">
          Cargando laptops y monitores...
        </p>
      ) : list.total === 0 ? (
        <EmptyState text="No hay equipos con esa búsqueda." />
      ) : list.view === "grid" ? (
        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {list.pageItems.map((asset) => (
            <div
              key={asset.id}
              className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-[var(--shadow)]"
            >
              <button
                type="button"
                onClick={() => setPreviewId(asset.id)}
                className="w-full text-left transition hover:opacity-90"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-semibold">{asset.name}</p>
                  <Badge tone={statusTone(asset.status)}>{asset.status}</Badge>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  {asset.serialNumber}
                </p>
                <p className="mt-2 text-sm">
                  {assignee(asset) || (
                    <span className="text-[var(--muted)]">Sin asignar</span>
                  )}
                </p>
              </button>
              {role === "ADMIN" && (
                <div className="mt-3 flex gap-2">
                  <AssetPreviewButton onClick={() => setPreviewId(asset.id)} />
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-2 py-1"
                    title="Editar"
                    onClick={() => setEditId(asset.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
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
                  label="Serie"
                  columnKey="serial"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                />
                <SortableTh
                  label="Estado"
                  columnKey="status"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                />
                <SortableTh
                  label="Asignado a"
                  columnKey="assigned"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                />
                {role === "ADMIN" && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {list.pageItems.map((asset) => (
                <tr
                  key={asset.id}
                  className="cursor-pointer border-t border-[var(--border)]"
                  onClick={() => setPreviewId(asset.id)}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold">{asset.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {asset.brand} {asset.model}
                      {vista !== "monitores" && asset.anydesk
                        ? ` · AnyDesk ${asset.anydesk}`
                        : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-mono text-[13px]">{asset.serialNumber}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {asset.inventoryNumber}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(asset.status)}>
                      {asset.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {assignee(asset) ? (
                      <div>
                        <p>{assignee(asset)}</p>
                        {asset.assignments[0]?.employee.position?.name && (
                          <p className="text-xs text-[var(--muted)]">
                            {asset.assignments[0].employee.position.name}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--muted)]">Sin asignar</span>
                    )}
                  </td>
                  {role === "ADMIN" && (
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="row-actions">
                        <AssetPreviewButton
                          onClick={() => setPreviewId(asset.id)}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="px-2 py-1"
                          title="Editar"
                          onClick={() => setEditId(asset.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
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
