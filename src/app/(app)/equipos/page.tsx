"use client";

import { useEffect, useMemo, useState } from "react";
import { AssetPreview, type AssetListItem } from "@/components/AssetPreview";
import { ListFooter, ListToolbar } from "@/components/ListToolbar";
import { SortableTh } from "@/components/SortableTh";
import { Badge, EmptyState, PageHeader, statusTone } from "@/components/ui";
import { useListControls } from "@/hooks/useListControls";

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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [laptopRes, monitorRes] = await Promise.all([
        fetch("/api/assets?category=Laptop"),
        fetch("/api/assets?category=Monitor"),
      ]);
      const [laptopData, monitorData] = await Promise.all([
        laptopRes.json(),
        monitorRes.json(),
      ]);
      if (cancelled) return;
      setLaptops(laptopData.assets || []);
      setMonitors(monitorData.assets || []);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
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
    if (vista === "activas") return laptops.filter((asset) => asset.status === "Activo");
    if (vista === "inactivas") return laptops.filter((asset) => asset.status !== "Activo");
    return monitors;
  }, [vista, laptops, monitors]);

  const list = useListControls(visible, {
    storageKey: "equipos-consulta",
    defaultView: "list",
    getName: (asset) =>
      `${asset.name} ${asset.brand} ${asset.model} ${asset.anydesk || ""} ${assignee(asset)} ${asset.assignments[0]?.employee.email || ""}`,
    getSerial: (asset) => `${asset.serialNumber} ${asset.inventoryNumber}`,
    defaultSortKey: "assigned",
    sortFields: {
      name: { label: "Equipo", getValue: (asset) => asset.name },
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
        title="Laptops y monitores"
        subtitle="Consulta rápida de equipos de cómputo y monitores. Mouse, cables, teléfonos y el resto del inventario no entran aquí."
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {VISTAS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setVista(item.id)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              vista === item.id
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-2)]"
            }`}
          >
            {item.label} ({counts[item.id]})
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
        namePlaceholder="Equipo, serie, inventario o usuario..."
      />

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Cargando laptops y monitores...</p>
      ) : list.total === 0 ? (
        <EmptyState text="No hay equipos con esa búsqueda." />
      ) : list.view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.pageItems.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => setPreviewId(asset.id)}
              className="rounded-[1.1rem] border border-[var(--border)] bg-[var(--surface)] p-4 text-left shadow-[var(--shadow)] transition hover:border-[var(--accent)]"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="font-medium">{asset.name}</p>
                <Badge tone={statusTone(asset.status)}>{asset.status}</Badge>
              </div>
              <p className="text-xs text-[var(--muted)]">{asset.serialNumber}</p>
              <p className="mt-2 text-sm">
                {assignee(asset) || (
                  <span className="text-[var(--muted)]">Sin asignar</span>
                )}
              </p>
            </button>
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
                    <p className="font-medium">{asset.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {asset.brand} {asset.model}
                      {vista !== "monitores" && asset.anydesk
                        ? ` · AnyDesk ${asset.anydesk}`
                        : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{asset.serialNumber}</p>
                    <p className="text-xs text-[var(--muted)]">{asset.inventoryNumber}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(asset.status)}>{asset.status}</Badge>
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

      {previewId && (
        <AssetPreview assetId={previewId} onClose={() => setPreviewId(null)} />
      )}
    </div>
  );
}
