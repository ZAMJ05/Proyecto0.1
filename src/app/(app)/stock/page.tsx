"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Label,
  PageHeader,
  Select,
  statusTone,
} from "@/components/ui";
import { ListFooter, ListToolbar } from "@/components/ListToolbar";
import { SortableTh } from "@/components/SortableTh";
import { useListControls } from "@/hooks/useListControls";
import {
  QuickAssignBar,
  QuickAssignModal,
  assignAssetToEmployee,
  useActiveEmployees,
} from "@/components/QuickAssign";
import { CATEGORY_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

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
  notes: string | null;
};

export default function StockPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [category, setCategory] = useState("");
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [quickUserId, setQuickUserId] = useState("");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [modalAsset, setModalAsset] = useState<Asset | null>(null);
  const [flash, setFlash] = useState("");
  const { employees, loading: loadingEmployees } = useActiveEmployees();

  async function load() {
    const [stockRes, meRes] = await Promise.all([
      fetch("/api/assets?stockOnly=1"),
      fetch("/api/auth/me"),
    ]);
    const [stock, me] = await Promise.all([stockRes.json(), meRes.json()]);
    setAssets(stock.assets || []);
    setRole(me.user?.role || "USER");
  }

  useEffect(() => {
    load();
  }, []);

  const selectedUser = employees.find((e) => e.id === quickUserId);

  async function removeAsset(asset: Asset) {
    if (
      !confirm(
        `¿Eliminar "${asset.name}" (${asset.serialNumber}) del inventario?\nEsta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo eliminar");
      return;
    }
    await load();
  }

  async function quickAssign(asset: Asset) {
    if (!quickUserId) {
      setModalAsset(asset);
      return;
    }
    setAssigningId(asset.id);
    setFlash("");
    try {
      await assignAssetToEmployee({
        assetId: asset.id,
        employeeId: quickUserId,
        notes: `Asignado desde Stock a ${selectedUser?.name || "usuario"}`,
      });
      setFlash(`✓ ${asset.name} → ${selectedUser?.name}`);
      window.setTimeout(() => setFlash(""), 2500);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo asignar");
    } finally {
      setAssigningId(null);
    }
  }

  const categoriesInStock = useMemo(() => {
    const set = new Set(assets.map((a) => a.category));
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [assets]);

  const filteredByCategory = useMemo(() => {
    if (!category) return assets;
    return assets.filter((a) => a.category === category);
  }, [assets, category]);

  const list = useListControls(filteredByCategory, {
    storageKey: "stock-p25",
    defaultView: "list",
    getName: (a) => a.name,
    getSerial: (a) => `${a.serialNumber} ${a.inventoryNumber}`,
    defaultSortKey: "name",
    sortFields: {
      name: { label: "Nombre", getValue: (a) => a.name },
      category: { label: "Categoría", getValue: (a) => a.category },
      serial: { label: "Serial", getValue: (a) => a.serialNumber },
      inventory: {
        label: "Inventario",
        getValue: (a) => a.inventoryNumber,
      },
      purchase: {
        label: "Compra",
        getValue: (a) => new Date(a.purchaseDate).getTime(),
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Stock / Reserva"
        subtitle="Asigna equipos en reserva a un usuario activo en un clic."
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card className="animate-rise">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Total en stock
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl">
            {assets.length}
          </p>
        </Card>
        <Card className="animate-rise stagger-1">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Laptops
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl">
            {assets.filter((a) => a.category === "Laptop").length}
          </p>
        </Card>
        <Card className="animate-rise stagger-2">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Complementos
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl">
            {
              assets.filter((a) =>
                ["Mouse", "Teclado", "Dock", "Adaptador", "Monitor"].includes(
                  a.category
                )
              ).length
            }
          </p>
        </Card>
      </div>

      {role === "ADMIN" && (
        <div className="mb-4 animate-rise">
          {loadingEmployees ? (
            <Card>
              <p className="text-sm text-[var(--muted)]">
                Cargando usuarios activos...
              </p>
            </Card>
          ) : (
            <QuickAssignBar
              employees={employees}
              employeeId={quickUserId}
              onEmployeeChange={setQuickUserId}
            />
          )}
          {flash && (
            <p className="mt-2 rounded-xl bg-[var(--badge-success-bg)] px-3 py-2 text-sm text-[var(--badge-success-fg)]">
              {flash}
            </p>
          )}
        </div>
      )}

      <Card className="mb-4">
        <Label>Filtrar por categoría</Label>
        <Select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            list.setPage(1);
          }}
        >
          <option value="">Todas las categorías</option>
          {categoriesInStock.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c] || c} (
              {assets.filter((a) => a.category === c).length})
            </option>
          ))}
        </Select>
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
        sortOptions={list.sortOptions}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onSortChange={list.setSort}
      />

      {list.total === 0 ? (
        <EmptyState text="No hay equipos en stock/reserva con esos filtros." />
      ) : list.view === "grid" ? (
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
                  <dd>{CATEGORY_LABELS[asset.category] || asset.category}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--muted)]">Serial</dt>
                  <dd>{asset.serialNumber}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--muted)]">Inventario</dt>
                  <dd>{asset.inventoryNumber}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--muted)]">Compra</dt>
                  <dd>{formatDate(asset.purchaseDate)}</dd>
                </div>
              </dl>
              {asset.notes && (
                <p className="mt-3 text-xs text-[var(--muted)]">{asset.notes}</p>
              )}
              {role === "ADMIN" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    className="px-2 py-1"
                    disabled={assigningId === asset.id}
                    onClick={() => quickAssign(asset)}
                    title={
                      selectedUser
                        ? `Asignar a ${selectedUser.name}`
                        : "Elegir usuario y asignar"
                    }
                  >
                    <UserPlus className="h-4 w-4" />
                    {assigningId === asset.id
                      ? "..."
                      : selectedUser
                        ? `Asignar a ${selectedUser.name.split(" ")[0]}`
                        : "Asignar"}
                  </Button>
                  <Button
                    variant="danger"
                    className="px-2 py-1"
                    onClick={() => removeAsset(asset)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="table-shell">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--surface-2)] text-xs uppercase text-[var(--muted)]">
              <tr>
                <SortableTh
                  label="Nombre"
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
                  label="Serial"
                  columnKey="serial"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                />
                <SortableTh
                  label="Inventario"
                  columnKey="inventory"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                />
                <SortableTh
                  label="Compra"
                  columnKey="purchase"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                />
                {role === "ADMIN" && (
                  <th className="px-4 py-3 text-left">Acciones</th>
                )}
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
                  <td className="px-4 py-3">
                    {CATEGORY_LABELS[asset.category] || asset.category}
                  </td>
                  <td className="px-4 py-3">{asset.serialNumber}</td>
                  <td className="px-4 py-3">{asset.inventoryNumber}</td>
                  <td className="px-4 py-3">{formatDate(asset.purchaseDate)}</td>
                  {role === "ADMIN" && (
                    <td className="px-4 py-3">
                      <div className="row-actions">
                        <Button
                          className="px-2 py-1"
                          disabled={assigningId === asset.id}
                          onClick={() => quickAssign(asset)}
                          title={
                            selectedUser
                              ? `Asignar a ${selectedUser.name}`
                              : "Elegir usuario y asignar"
                          }
                        >
                          <UserPlus className="h-4 w-4" />
                          {assigningId === asset.id
                            ? "..."
                            : selectedUser
                              ? "Asignar"
                              : "Asignar"}
                        </Button>
                        <Button
                          variant="danger"
                          className="px-2 py-1"
                          title="Eliminar del inventario"
                          onClick={() => removeAsset(asset)}
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
        open={!!modalAsset}
        asset={modalAsset}
        employees={employees}
        onClose={() => setModalAsset(null)}
        onAssigned={async () => {
          setFlash(
            modalAsset
              ? `✓ ${modalAsset.name} asignado`
              : "✓ Equipo asignado"
          );
          window.setTimeout(() => setFlash(""), 2500);
          await load();
        }}
      />
    </div>
  );
}
