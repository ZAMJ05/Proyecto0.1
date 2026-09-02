"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, Filter, Pencil, Trash2, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Select,
  statusTone,
} from "@/components/ui";
import {
  AssetPreview,
  AssetPreviewButton,
  type AssetListItem,
} from "@/components/AssetPreview";
import { AssetForm, AssetFormValues } from "@/components/AssetForm";
import { CopyableValue } from "@/components/CopyableValue";
import { ListFooter, ListToolbar } from "@/components/ListToolbar";
import { SortableTh } from "@/components/SortableTh";
import { useListControls } from "@/hooks/useListControls";
import { ASSET_CATEGORIES, CATEGORY_LABELS } from "@/lib/constants";
import { formatDate, toInputDate } from "@/lib/utils";

function ActivosContent() {
  const searchParams = useSearchParams();
  const [assets, setAssets] = useState<AssetListItem[]>([]);
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [loading, setLoading] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AssetListItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    q: searchParams.get("q") || "",
    category: searchParams.get("category") || "",
    brand: searchParams.get("brand") || "",
    model: searchParams.get("model") || "",
    serialNumber: searchParams.get("serialNumber") || "",
    inventoryNumber: searchParams.get("inventoryNumber") || "",
    employee: searchParams.get("employee") || "",
    anydesk: searchParams.get("anydesk") || "",
    unassigned: searchParams.get("unassigned") || "",
  });

  const query = useMemo(() => {
    const p = new URLSearchParams();
    p.set("status", "Activo");
    Object.entries(filters).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    return p.toString();
  }, [filters]);

  const hasFilters = Object.values(filters).some(Boolean);

  async function load() {
    setLoading(true);
    const [assetsRes, meRes] = await Promise.all([
      fetch(`/api/assets?${query}`),
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const list = useListControls(assets, {
    storageKey: "activos-p25",
    defaultView: "list",
    getName: (a) =>
      `${a.name} ${a.assignments[0]?.employee.name || ""} ${a.assignments[0]?.employee.email || ""}`,
    getSerial: (a) => `${a.serialNumber} ${a.inventoryNumber}`,
    defaultSortKey: "name",
    sortFields: {
      name: { label: "Nombre", getValue: (a) => a.name },
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

  function clearFilters() {
    setFilters({
      q: "",
      category: "",
      brand: "",
      model: "",
      serialNumber: "",
      inventoryNumber: "",
      employee: "",
      anydesk: "",
      unassigned: "",
    });
  }

  async function saveAsset(values: AssetFormValues) {
    if (!editing) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/assets/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      setShowForm(false);
      setEditing(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  }

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

  const quickChips = [
    { label: "Todos activos", apply: () => clearFilters() },
    {
      label: "Laptops",
      apply: () => setFilters((f) => ({ ...f, category: "Laptop" })),
      active: filters.category === "Laptop",
    },
    {
      label: "Sin asignar",
      apply: () => setFilters((f) => ({ ...f, unassigned: "1" })),
      active: filters.unassigned === "1",
    },
    {
      label: "Monitores",
      apply: () => setFilters((f) => ({ ...f, category: "Monitor" })),
      active: filters.category === "Monitor",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Equipos activos"
        subtitle="Consulta rápida de equipos en estado Activo, con filtros y vista previa."
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {quickChips.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={chip.apply}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              chip.active
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
            }`}
          >
            {chip.label}
          </button>
        ))}
        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)]"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>

      <Card className="mb-4 animate-rise">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
            <Filter className="h-4 w-4" />
            Filtros
          </div>
          <Badge tone="success">Estado: Activo</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <div>
            <Label>Búsqueda general</Label>
            <Input
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Nombre, serial, notas, usuario..."
            />
          </div>
          <div>
            <Label>Categoría</Label>
            <Select
              value={filters.category}
              onChange={(e) =>
                setFilters((f) => ({ ...f, category: e.target.value }))
              }
            >
              <option value="">Todas</option>
              {ASSET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c] || c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Marca</Label>
            <Input
              value={filters.brand}
              onChange={(e) =>
                setFilters((f) => ({ ...f, brand: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>Modelo</Label>
            <Input
              value={filters.model}
              onChange={(e) =>
                setFilters((f) => ({ ...f, model: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>Serial</Label>
            <Input
              value={filters.serialNumber}
              onChange={(e) =>
                setFilters((f) => ({ ...f, serialNumber: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>N° inventario</Label>
            <Input
              value={filters.inventoryNumber}
              onChange={(e) =>
                setFilters((f) => ({ ...f, inventoryNumber: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>Usuario asignado</Label>
            <Input
              value={filters.employee}
              onChange={(e) =>
                setFilters((f) => ({ ...f, employee: e.target.value }))
              }
              placeholder="Nombre o email..."
            />
          </div>
          <div>
            <Label>AnyDesk (laptops)</Label>
            <Input
              value={filters.anydesk}
              onChange={(e) =>
                setFilters((f) => ({ ...f, anydesk: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>Asignación</Label>
            <Select
              value={filters.unassigned}
              onChange={(e) =>
                setFilters((f) => ({ ...f, unassigned: e.target.value }))
              }
            >
              <option value="">Todos</option>
              <option value="1">Solo sin asignar</option>
            </Select>
          </div>
        </div>
      </Card>

      <ListToolbar
        name={list.name}
        serial={list.serial}
        onNameChange={list.setName}
        onSerialChange={list.setSerial}
        view={list.view}
        onViewChange={list.setView}
        page={list.page}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
        showingFrom={list.showingFrom}
        showingTo={list.showingTo}
        total={list.total}
        namePlaceholder="Equipo o usuario..."
        serialPlaceholder="Serial o inventario..."
        sortOptions={list.sortOptions}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onSortChange={list.setSort}
      />

      {showForm && editing && role === "ADMIN" && (
        <Card className="mb-6 animate-fade">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl">
            Editar: {editing.name}
          </h2>
          <AssetForm
            initial={{
              name: editing.name,
              category: editing.category,
              brand: editing.brand,
              model: editing.model,
              serialNumber: editing.serialNumber,
              inventoryNumber: editing.inventoryNumber,
              status: editing.status,
              purchaseDate: toInputDate(editing.purchaseDate),
              renewalDate: toInputDate(editing.renewalDate),
              anydesk: editing.anydesk || "",
              notes: editing.notes || "",
            }}
            mode="edit"
            submitting={submitting}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
            onSubmit={saveAsset}
          />
        </Card>
      )}

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
                />
                <SortableTh
                  label="AnyDesk"
                  columnKey="anydesk"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
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
                  </td>
                  <td className="px-4 py-3">
                    {CATEGORY_LABELS[asset.category] || asset.category}
                  </td>
                  <td className="px-4 py-3">
                    <p>{asset.serialNumber}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {asset.inventoryNumber}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {asset.assignments[0]?.employee.name || (
                      <span className="text-[var(--muted)]">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p>{formatDate(asset.purchaseDate)}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {asset.category === "Laptop"
                        ? formatDate(asset.renewalDate)
                        : "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
                            onClick={() => {
                              setEditing(asset);
                              setShowForm(true);
                            }}
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
              <div className="mt-3 flex items-center gap-2 text-xs text-[var(--accent-strong)]">
                <Eye className="h-3.5 w-3.5" />
                Clic para vista previa
              </div>
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
        onEdit={
          role === "ADMIN"
            ? (a) => {
                setEditing(a);
                setShowForm(true);
              }
            : undefined
        }
      />
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
