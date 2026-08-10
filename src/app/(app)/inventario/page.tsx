"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Pencil, Trash2, Filter } from "lucide-react";
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
import { AssetForm, AssetFormValues } from "@/components/AssetForm";
import { ListToolbar } from "@/components/ListToolbar";
import { useListControls } from "@/hooks/useListControls";
import { ASSET_CATEGORIES, ASSET_STATUSES } from "@/lib/constants";
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
  renewalDate: string;
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
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    category: "",
    status: searchParams.get("status") || "",
    brand: "",
    serialNumber: "",
    inventoryNumber: "",
    employee: "",
    anydesk: "",
    unassigned: searchParams.get("unassigned") || "",
  });

  const query = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    return p.toString();
  }, [filters]);

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
    storageKey: "inventario",
    defaultView: "list",
    getName: (a) => a.name,
    getSerial: (a) => `${a.serialNumber} ${a.inventoryNumber}`,
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
        subtitle="Alta, consulta y filtros avanzados de equipos IT."
        actions={
          role === "ADMIN" ? (
            <Button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Alta de equipo
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-4 animate-rise">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--ink)]">
          <Filter className="h-4 w-4" />
          Filtros avanzados
        </div>
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          <div>
            <Label>Búsqueda general</Label>
            <Input
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Nombre, serial, notas..."
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
                  {c === "AccesPoint" ? "Access Point" : c}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Estado</Label>
            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value }))
              }
            >
              <option value="">Todos</option>
              {ASSET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
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
            <Label>No. inventario</Label>
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
            />
          </div>
          <div>
            <Label>AnyDesk</Label>
            <Input
              value={filters.anydesk}
              onChange={(e) =>
                setFilters((f) => ({ ...f, anydesk: e.target.value }))
              }
            />
          </div>
          <div>
            <Label>Sin asignar</Label>
            <Select
              value={filters.unassigned}
              onChange={(e) =>
                setFilters((f) => ({ ...f, unassigned: e.target.value }))
              }
            >
              <option value="">No</option>
              <option value="1">Solo activos sin asignar</option>
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
      />

      {showForm && role === "ADMIN" && (
        <Card className="mb-6 animate-fade">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl">
            {editing ? "Editar equipo" : "Registrar equipo"}
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
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--surface-2)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">Activo</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Serial / Inv.</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Asignado</th>
                <th className="px-4 py-3">Compra / Renov.</th>
                <th className="px-4 py-3">AnyDesk</th>
                {role === "ADMIN" && <th className="px-4 py-3">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {list.pageItems.map((asset) => (
                <tr key={asset.id} className="border-t border-[var(--border)]">
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
                      {formatDate(asset.renewalDate)}
                    </p>
                  </td>
                  <td className="px-4 py-3">{asset.anydesk || "—"}</td>
                  {role === "ADMIN" && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
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
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.pageItems.map((asset) => (
            <Card key={asset.id}>
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
              </dl>
              {role === "ADMIN" && (
                <div className="mt-3 flex gap-2">
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
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
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
