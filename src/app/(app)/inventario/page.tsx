"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Pencil, Trash2, UserPlus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Select,
  statusTone,
} from "@/components/ui";
import { AssetForm, AssetFormValues } from "@/components/AssetForm";
import {
  AssetPreview,
  AssetPreviewButton,
} from "@/components/AssetPreview";
import { CopyableValue } from "@/components/CopyableValue";
import { ListFooter, ListToolbar } from "@/components/ListToolbar";
import { SortableTh } from "@/components/SortableTh";
import { useListControls } from "@/hooks/useListControls";
import {
  QuickAssignModal,
  useActiveEmployees,
} from "@/components/QuickAssign";
import { ASSET_CATEGORIES, ASSET_STATUSES, CATEGORY_LABELS } from "@/lib/constants";
import { formatDate, toInputDate } from "@/lib/utils";

type Asset = {
  id: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  serialNumber: string;
  inventoryNumber: string;
  status: string;
  purchaseDate: string;
  renewalDate: string | null;
  anydesk: string | null;
  notes: string | null;
  assignments: Array<{
    employee: {
      name: string;
      email: string | null;
      position?: { name: string } | null;
    };
  }>;
};

function InventarioContent() {
  const searchParams = useSearchParams();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(searchParams.get("alta") === "1");
  const [editing, setEditing] = useState<Asset | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [assignAsset, setAssignAsset] = useState<Asset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [unassignedOnly, setUnassignedOnly] = useState(
    searchParams.get("unassigned") === "1"
  );
  const { employees } = useActiveEmployees();

  async function load() {
    setLoading(true);
    const [assetsRes, meRes] = await Promise.all([
      fetch("/api/assets"),
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
      if (status && asset.status !== status) return false;
      if (unassignedOnly && asset.assignments.length > 0) return false;
      return true;
    });
  }, [assets, category, status, unassignedOnly]);

  const list = useListControls(visible, {
    storageKey: "inventario-p50",
    defaultView: "list",
    getName: (a) =>
      `${a.name} ${a.brand} ${a.model} ${a.notes || ""} ${a.anydesk || ""} ${a.assignments[0]?.employee.name || ""} ${a.assignments[0]?.employee.email || ""}`,
    getSerial: (a) => `${a.serialNumber} ${a.inventoryNumber}`,
    defaultSortKey: "name",
    sortFields: {
      name: { label: "Nombre", getValue: (a) => a.name },
      category: { label: "Categoría", getValue: (a) => a.category },
      serial: { label: "Serial", getValue: (a) => a.serialNumber },
      status: { label: "Estado", getValue: (a) => a.status },
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

  async function saveAsset(values: AssetFormValues) {
    setSubmitting(true);
    try {
      const url = editing ? `/api/assets/${editing.id}` : "/api/assets";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      if (!editing && data.createdCount > 1) {
        alert(`Se registraron ${data.createdCount} productos correctamente.`);
      }
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
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Inventario"
        subtitle="Busca, filtra y asigna desde la misma lista. El alta entra directo a stock."
        actions={
          <div className="flex flex-wrap gap-2">
            {role === "ADMIN" && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                  window.setTimeout(() => {
                    document.getElementById("alta-equipo")?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }, 50);
                }}
              >
                <Plus className="h-4 w-4" />
                Agregar a stock
              </Button>
            )}
          </div>
        }
      />

      <ListToolbar
        extra={
          <>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Categoría"
              className="w-full lg:w-40"
            >
              <option value="">Categoría</option>
              {ASSET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c] || c}
                </option>
              ))}
            </Select>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              aria-label="Estado"
              className="w-full lg:w-36"
            >
              <option value="">Estado</option>
              {ASSET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select
              value={unassignedOnly ? "1" : ""}
              onChange={(e) => setUnassignedOnly(e.target.value === "1")}
              aria-label="Asignación"
              className="w-full lg:w-40"
            >
              <option value="">Asignación</option>
              <option value="1">Sin asignar</option>
            </Select>
          </>
        }
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
        namePlaceholder="Nombre, usuario, serie, inventario o AnyDesk..."
        sortOptions={list.sortOptions}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onSortChange={list.setSort}
      />

      {showForm && role === "ADMIN" && (
        <Card id="alta-equipo" className="mb-6 animate-fade">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl">
            {editing ? "Editar equipo" : "Nuevo equipo en stock"}
          </h2>
          <AssetForm
            initial={
              editing
                ? {
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
                  }
                : undefined
            }
            mode={editing ? "edit" : "create"}
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
        <p className="text-sm text-[var(--muted)]">Cargando inventario...</p>
      ) : list.total === 0 ? (
        <EmptyState text="No hay equipos con estos filtros." />
      ) : list.view === "list" ? (
        <div className="table-shell">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <SortableTh
                  label="Activo"
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
                  label="Estado"
                  columnKey="status"
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
                  <td className="px-4 py-3">{asset.category}</td>
                  <td className="px-4 py-3">
                    <p>{asset.serialNumber}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {asset.inventoryNumber}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone(asset.status)}>{asset.status}</Badge>
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
                        : "Sin renovación"}
                    </p>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {asset.category === "Laptop" ? (
                      <CopyableValue
                        value={asset.anydesk}
                        label="Copiar AnyDesk"
                      />
                    ) : (
                      <span className="text-xs text-[var(--muted)]">
                        No aplica
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="row-actions">
                      <AssetPreviewButton
                        onClick={() => setPreviewId(asset.id)}
                      />
                      {role === "ADMIN" &&
                        !asset.assignments[0] &&
                        (asset.status === "Activo" || asset.status === "Stock") && (
                          <Button
                            className="px-2 py-1"
                            title="Asignar a un usuario"
                            onClick={() => setAssignAsset(asset)}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        )}
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
                  <dd>{asset.category}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--muted)]">Serial</dt>
                  <dd>{asset.serialNumber}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--muted)]">Asignado</dt>
                  <dd>{asset.assignments[0]?.employee.name || "Sin asignar"}</dd>
                </div>
                {asset.category === "Laptop" && (
                  <div
                    className="flex items-center justify-between gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <dt className="text-[var(--muted)]">AnyDesk</dt>
                    <dd>
                      <CopyableValue
                        value={asset.anydesk}
                        label="Copiar AnyDesk"
                      />
                    </dd>
                  </div>
                )}
              </dl>
              <div
                className="mt-3 flex gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <AssetPreviewButton onClick={() => setPreviewId(asset.id)} />
                {role === "ADMIN" &&
                  !asset.assignments[0] &&
                  (asset.status === "Activo" || asset.status === "Stock") && (
                    <Button
                      className="px-2 py-1"
                      onClick={() => setAssignAsset(asset)}
                    >
                      <UserPlus className="h-4 w-4" />
                      Asignar
                    </Button>
                  )}
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

      <QuickAssignModal
        open={!!assignAsset}
        asset={assignAsset}
        employees={employees}
        onClose={() => setAssignAsset(null)}
        onAssigned={async () => {
          setAssignAsset(null);
          await load();
        }}
      />

      <AssetPreview
        assetId={previewId}
        onClose={() => setPreviewId(null)}
        onEdit={
          role === "ADMIN"
            ? (a) => {
                setEditing(a as Asset);
                setShowForm(true);
              }
            : undefined
        }
      />
    </div>
  );
}

export default function InventarioPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-[var(--muted)]">Cargando...</p>}
    >
      <InventarioContent />
    </Suspense>
  );
}
