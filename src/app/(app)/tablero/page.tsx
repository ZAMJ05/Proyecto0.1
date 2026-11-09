"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Columns3,
  List,
  Plus,
  UserPlus,
} from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
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
import {
  ASSET_CATEGORIES,
  CATEGORY_LABELS,
} from "@/lib/constants";
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
  anydesk: string | null;
  notes: string | null;
  assignments: Array<{
    employee: {
      id: string;
      name: string;
      email: string | null;
      position?: { name: string } | null;
    };
  }>;
};

type Scope = "assignable" | "all";
type BoardView = "list" | "kanban";

function assigneeName(asset: Asset) {
  return asset.assignments[0]?.employee.name || "";
}

function canAssignAsset(asset: Asset) {
  if (asset.status === "Stock") return true;
  if (asset.status !== "Activo") return false;
  return asset.assignments.length === 0;
}

export default function TableroPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [scope, setScope] = useState<Scope>("assignable");
  const [category, setCategory] = useState("");
  const [boardView, setBoardView] = useState<BoardView>("kanban");
  const [quickUserId, setQuickUserId] = useState("");
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [modalAsset, setModalAsset] = useState<Asset | null>(null);
  const [flash, setFlash] = useState("");
  const { employees, loading: loadingEmployees } = useActiveEmployees();

  async function load() {
    setLoading(true);
    const url =
      scope === "assignable" ? "/api/assets?stockOnly=1" : "/api/assets";
    const [assetsRes, meRes] = await Promise.all([
      fetch(url),
      fetch("/api/auth/me"),
    ]);
    const [assetsData, meData] = await Promise.all([
      assetsRes.json(),
      meRes.json(),
    ]);
    setAssets(assetsData.assets || []);
    setRole(meData.user?.role || "USER");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [scope]);

  const selectedUser = employees.find((e) => e.id === quickUserId);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const asset of assets) {
      map.set(asset.category, (map.get(asset.category) || 0) + 1);
    }
    return map;
  }, [assets]);

  const visibleCategories = useMemo(() => {
    if (category) return [category];
    return ASSET_CATEGORIES.filter((c) => (categoryCounts.get(c) || 0) > 0);
  }, [category, categoryCounts]);

  const filtered = useMemo(() => {
    if (!category) return assets;
    return assets.filter((asset) => asset.category === category);
  }, [assets, category]);

  const list = useListControls(filtered, {
    storageKey: "tablero-asignacion",
    defaultView: "list",
    getName: (asset) =>
      `${asset.name} ${asset.brand} ${asset.model} ${asset.notes || ""} ${assigneeName(asset)}`,
    getSerial: (asset) => `${asset.serialNumber} ${asset.inventoryNumber}`,
    defaultSortKey: "category",
    sortFields: {
      name: { label: "Equipo", getValue: (asset) => asset.name },
      category: { label: "Categoría", getValue: (asset) => asset.category },
      serial: { label: "Serie", getValue: (asset) => asset.serialNumber },
      status: { label: "Estado", getValue: (asset) => asset.status },
      assigned: {
        label: "Asignado",
        getValue: (asset) => assigneeName(asset),
      },
    },
  });

  const kanbanQuery = list.query.trim().toLowerCase();
  const kanbanColumns = useMemo(() => {
    return visibleCategories.map((cat) => {
      const items = assets.filter((asset) => {
        if (asset.category !== cat) return false;
        if (!kanbanQuery) return true;
        const blob =
          `${asset.name} ${asset.brand} ${asset.model} ${asset.serialNumber} ${asset.inventoryNumber} ${asset.notes || ""} ${assigneeName(asset)}`.toLowerCase();
        return blob.includes(kanbanQuery);
      });
      return { category: cat, items };
    });
  }, [assets, visibleCategories, kanbanQuery]);

  async function quickAssign(asset: Asset) {
    if (!canAssignAsset(asset)) return;
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
        notes: `Asignado desde Tablero a ${selectedUser?.name || "usuario"}`,
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

  return (
    <div>
      <PageHeader
        module="Operación · Asignación"
        title="Tablero de asignación"
        subtitle="Inventario y stock en un solo lugar: filtra por categoría, ve el Kanban y asigna sin cambiar de sección."
        actions={
          role === "ADMIN" ? (
            <Link href="/inventario?alta=1">
              <Button>
                <Plus className="h-4 w-4" />
                Agregar a stock
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          className="sn-chip"
          data-active={scope === "assignable"}
          onClick={() => setScope("assignable")}
        >
          Para asignar
        </button>
        <button
          type="button"
          className="sn-chip"
          data-active={scope === "all"}
          onClick={() => setScope("all")}
        >
          Todo el inventario
        </button>
        <span className="mx-1 hidden h-6 w-px bg-[var(--border)] sm:inline-block" />
        <button
          type="button"
          className="sn-chip"
          data-active={boardView === "kanban"}
          onClick={() => setBoardView("kanban")}
        >
          <Columns3 className="h-3.5 w-3.5" />
          Kanban
        </button>
        <button
          type="button"
          className="sn-chip"
          data-active={boardView === "list"}
          onClick={() => setBoardView("list")}
        >
          <List className="h-3.5 w-3.5" />
          Lista
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <button
          type="button"
          className="sn-chip"
          data-active={!category}
          onClick={() => setCategory("")}
        >
          Todas las categorías
          <span className="text-[var(--muted)]">({assets.length})</span>
        </button>
        {ASSET_CATEGORIES.map((cat) => {
          const count = categoryCounts.get(cat) || 0;
          if (scope === "assignable" && count === 0 && category !== cat) {
            return null;
          }
          return (
            <button
              key={cat}
              type="button"
              className="sn-chip"
              data-active={category === cat}
              onClick={() => setCategory(cat)}
            >
              {CATEGORY_LABELS[cat] || cat}
              <span className="text-[var(--muted)]">({count})</span>
            </button>
          );
        })}
      </div>

      {role === "ADMIN" && (
        <div className="mb-4">
          <QuickAssignBar
            employees={employees}
            employeeId={quickUserId}
            onEmployeeChange={setQuickUserId}
          />
          {flash && (
            <p className="mt-2 text-sm font-medium text-[var(--badge-success-fg)]">
              {flash}
            </p>
          )}
          {loadingEmployees && (
            <p className="mt-2 text-xs text-[var(--muted)]">Cargando usuarios...</p>
          )}
        </div>
      )}

      <ListToolbar
        name={list.name}
        onNameChange={list.setName}
        view={list.view}
        onViewChange={list.setView}
        showingFrom={
          boardView === "kanban"
            ? kanbanColumns.reduce((n, col) => n + col.items.length, 0) === 0
              ? 0
              : 1
            : list.showingFrom
        }
        showingTo={
          boardView === "kanban"
            ? kanbanColumns.reduce((n, col) => n + col.items.length, 0)
            : list.showingTo
        }
        total={
          boardView === "kanban"
            ? kanbanColumns.reduce((n, col) => n + col.items.length, 0)
            : list.total
        }
        namePlaceholder="Equipo, serie, inventario o usuario..."
      />

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Cargando tablero...</p>
      ) : boardView === "kanban" ? (
        kanbanColumns.every((col) => col.items.length === 0) ? (
          <EmptyState text="No hay equipos con esa búsqueda o categoría." />
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-3">
            {kanbanColumns.map((col) => (
              <section
                key={col.category}
                className="flex w-[280px] shrink-0 flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-2)] shadow-[var(--shadow)]"
              >
                <header className="sticky top-0 z-[1] flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--list-header)] px-3 py-2.5">
                  <div>
                    <p className="text-sm font-bold text-[var(--ink)]">
                      {CATEGORY_LABELS[col.category] || col.category}
                    </p>
                    <p className="text-[11px] text-[var(--muted)]">
                      {col.items.length} equipo
                      {col.items.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Badge tone="info">{col.items.length}</Badge>
                </header>
                <div className="max-h-[min(68vh,720px)] space-y-2 overflow-y-auto p-2">
                  {col.items.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-[var(--muted)]">
                      Vacío
                    </p>
                  ) : (
                    col.items.map((asset) => {
                      const canAssign =
                        role === "ADMIN" && canAssignAsset(asset);
                      return (
                        <article
                          key={asset.id}
                          className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow)]"
                        >
                          <div className="mb-1.5 flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-[var(--ink)]">
                              {asset.name}
                            </p>
                            <Badge tone={statusTone(asset.status)}>
                              {asset.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-[var(--muted)]">
                            {asset.serialNumber}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {asset.brand} {asset.model}
                          </p>
                          <p className="mt-2 text-xs">
                            {assigneeName(asset) ? (
                              <span className="font-medium text-[var(--ink)]">
                                {assigneeName(asset)}
                              </span>
                            ) : (
                              <span className="text-[var(--muted)]">
                                Sin asignar
                              </span>
                            )}
                          </p>
                          {canAssign && (
                            <Button
                              type="button"
                              variant="secondary"
                              className="mt-2 w-full px-2 py-1.5 text-xs"
                              disabled={assigningId === asset.id}
                              onClick={() => quickAssign(asset)}
                            >
                              <UserPlus className="h-3.5 w-3.5" />
                              {assigningId === asset.id
                                ? "Asignando..."
                                : quickUserId
                                  ? "Asignar"
                                  : "Elegir usuario"}
                            </Button>
                          )}
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            ))}
          </div>
        )
      ) : list.total === 0 ? (
        <EmptyState text="No hay equipos con esa búsqueda o categoría." />
      ) : (
        <>
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
                  {role === "ADMIN" && <th>Acción</th>}
                </tr>
              </thead>
              <tbody>
                {list.pageItems.map((asset) => {
                  const canAssign = canAssignAsset(asset);
                  return (
                    <tr key={asset.id}>
                      <td>
                        <p className="font-semibold">{asset.name}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {asset.brand} {asset.model}
                          {asset.purchaseDate
                            ? ` · Compra ${formatDate(asset.purchaseDate)}`
                            : ""}
                        </p>
                      </td>
                      <td>{CATEGORY_LABELS[asset.category] || asset.category}</td>
                      <td>
                        <p>{asset.serialNumber}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {asset.inventoryNumber}
                        </p>
                      </td>
                      <td>
                        <Badge tone={statusTone(asset.status)}>
                          {asset.status}
                        </Badge>
                      </td>
                      <td>
                        {assigneeName(asset) || (
                          <span className="text-[var(--muted)]">Sin asignar</span>
                        )}
                      </td>
                      {role === "ADMIN" && (
                        <td>
                          {canAssign ? (
                            <Button
                              type="button"
                              variant="secondary"
                              className="px-2 py-1"
                              disabled={assigningId === asset.id}
                              onClick={() => quickAssign(asset)}
                            >
                              <UserPlus className="h-4 w-4" />
                              {assigningId === asset.id ? "..." : "Asignar"}
                            </Button>
                          ) : (
                            <span className="text-xs text-[var(--muted)]">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <ListFooter
            page={list.page}
            totalPages={list.totalPages}
            onPageChange={list.setPage}
            showingFrom={list.showingFrom}
            showingTo={list.showingTo}
            total={list.total}
          />
        </>
      )}

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
