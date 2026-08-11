"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Box,
  Laptop,
  MonitorCheck,
  PackageOpen,
  ShieldOff,
  Wrench,
  RefreshCw,
  Warehouse,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { ListFooter, ListToolbar } from "@/components/ListToolbar";
import { SortableTh } from "@/components/SortableTh";
import { useListControls } from "@/hooks/useListControls";
import { formatDate } from "@/lib/utils";

type DashboardData = {
  cards: {
    active: number;
    recentChanges: number;
    activeUnassigned: number;
    total: number;
    disabled: number;
    stock: number;
    reparacion: number;
    renewalsDue: number;
    maintenancesDue: number;
    laptops: {
      active: number;
      inactive: number;
      stock: number;
      reparacion: number;
      tracked: number;
    };
  };
  recentChanges: Array<{
    id: string;
    action: string;
    details: string;
    createdAt: string;
    asset?: { name: string; serialNumber: string } | null;
  }>;
  charts: {
    byCategory: Array<{ name: string; value: number }>;
    byStatus: Array<{ name: string; value: number }>;
    laptopsByStatus: Array<{ name: string; value: number }>;
  };
};

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
  }, []);

  const changes = data?.recentChanges || [];
  const changeList = useListControls(changes, {
    storageKey: "dashboard-cambios-p25",
    defaultView: "list",
    getName: (c) => `${c.details} ${c.action}`,
    getSerial: (c) => c.asset?.serialNumber || c.asset?.name || "",
    defaultSortKey: "createdAt",
    defaultSortDir: "desc",
    sortFields: {
      createdAt: {
        label: "Fecha",
        getValue: (c) => new Date(c.createdAt).getTime(),
      },
      action: { label: "Acción", getValue: (c) => c.action },
      details: { label: "Detalle", getValue: (c) => c.details },
      serial: {
        label: "Serial",
        getValue: (c) => c.asset?.serialNumber || "",
      },
    },
  });

  if (!data) {
    return <p className="text-sm text-[var(--muted)]">Cargando dashboard...</p>;
  }

  const cards = [
    {
      label: "Equipos activos",
      value: data.cards.active,
      icon: MonitorCheck,
      href: "/inventario?status=Activo",
    },
    {
      label: "Sin asignar",
      value: data.cards.activeUnassigned,
      icon: PackageOpen,
      href: "/inventario?unassigned=1",
    },
    {
      label: "Total (sin baja)",
      value: data.cards.total,
      icon: Box,
      href: "/inventario",
    },
    {
      label: "Inactivos",
      value: data.cards.disabled,
      icon: ShieldOff,
      href: "/inventario?status=Inactivo",
    },
    {
      label: "Cambios",
      value: data.cards.recentChanges,
      icon: Activity,
      href: "/dashboard#cambios",
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle="Vista rápida del inventario. Haz clic en una tarjeta para ir al detalle."
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card, i) => {
          const Icon = card.icon;
          const stagger = ["stagger-1", "stagger-2", "stagger-3", "stagger-4", "stagger-5"][i];
          return (
            <Card
              key={card.label}
              className={`animate-rise ${stagger}`}
              onClick={() => router.push(card.href)}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-[var(--muted)]">
                    {card.label}
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
                    {card.value}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--accent-soft)] p-2 text-[var(--accent-strong)]">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="animate-rise">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-[var(--accent-soft)] p-2 text-[var(--accent-strong)]">
                <Laptop className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                  Laptops
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  Sin contar bajas · {data.cards.laptops.tracked} en seguimiento
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                router.push("/inventario?category=Laptop&status=Activo")
              }
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left transition hover:border-[var(--accent)]"
            >
              <p className="text-xs font-medium text-[var(--muted)]">Activas</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-4xl text-[var(--badge-success-fg)]">
                {data.cards.laptops.active}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                En uso operativo
              </p>
            </button>
            <button
              type="button"
              onClick={() =>
                router.push("/inventario?category=Laptop&status=Inactivo")
              }
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left transition hover:border-[var(--accent)]"
            >
              <p className="text-xs font-medium text-[var(--muted)]">
                Inactivas
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-4xl text-[var(--badge-danger-fg)]">
                {data.cards.laptops.inactive}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Fuera de operación
              </p>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                router.push("/inventario?category=Laptop&status=Stock")
              }
              className="rounded-xl border border-[var(--border)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
            >
              <span className="text-[var(--muted)]">Stock</span>
              <span className="ml-2 font-semibold text-[var(--ink)]">
                {data.cards.laptops.stock}
              </span>
            </button>
            <button
              type="button"
              onClick={() =>
                router.push("/inventario?category=Laptop&status=Reparacion")
              }
              className="rounded-xl border border-[var(--border)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
            >
              <span className="text-[var(--muted)]">Reparación</span>
              <span className="ml-2 font-semibold text-[var(--ink)]">
                {data.cards.laptops.reparacion}
              </span>
            </button>
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <Card onClick={() => router.push("/stock")}>
            <div className="flex items-center gap-3">
              <Warehouse className="h-4 w-4 text-[var(--accent)]" />
              <div>
                <p className="text-xs text-[var(--muted)]">Stock / reserva</p>
                <p className="text-2xl font-semibold text-[var(--ink)]">
                  {data.cards.stock}
                </p>
              </div>
            </div>
          </Card>
          <Card onClick={() => router.push("/ciclo-vida")}>
            <div className="flex items-center gap-3">
              <RefreshCw className="h-4 w-4 text-[var(--accent)]" />
              <div>
                <p className="text-xs text-[var(--muted)]">
                  Renovación laptops
                </p>
                <p className="text-2xl font-semibold text-[var(--ink)]">
                  {data.cards.renewalsDue}
                </p>
              </div>
            </div>
          </Card>
          <Card onClick={() => router.push("/ciclo-vida")}>
            <div className="flex items-center gap-3">
              <Wrench className="h-4 w-4 text-[var(--accent)]" />
              <div>
                <p className="text-xs text-[var(--muted)]">
                  Mantenimiento laptops
                </p>
                <p className="text-2xl font-semibold text-[var(--ink)]">
                  {data.cards.maintenancesDue}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-3">
        <Card className="animate-fade xl:col-span-1">
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
            Laptops por estado
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.charts.laptopsByStatus}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {data.charts.laptopsByStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="animate-fade xl:col-span-1">
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
            Por categoría
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted)" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted)" }} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="animate-fade xl:col-span-1">
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-lg">
            Por estado
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.charts.byStatus}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {data.charts.byStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section className="animate-fade" id="cambios">
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-xl">
          Cambios recientes
        </h2>
        <ListToolbar
          name={changeList.name}
          serial={changeList.serial}
          onNameChange={changeList.setName}
          onSerialChange={changeList.setSerial}
          view={changeList.view}
          onViewChange={changeList.setView}
          page={changeList.page}
          totalPages={changeList.totalPages}
          onPageChange={changeList.setPage}
          showingFrom={changeList.showingFrom}
          showingTo={changeList.showingTo}
          total={changeList.total}
          namePlaceholder="Buscar en detalle o acción..."
          serialPlaceholder="Serial del equipo..."
          sortOptions={changeList.sortOptions}
          sortKey={changeList.sortKey}
          sortDir={changeList.sortDir}
          onSortChange={changeList.setSort}
        />
        {changeList.total === 0 ? (
          <EmptyState text="Sin cambios para mostrar." />
        ) : changeList.view === "list" ? (
          <div className="table-shell">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-2)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <SortableTh
                    label="Fecha"
                    columnKey="createdAt"
                    activeKey={changeList.sortKey}
                    direction={changeList.sortDir}
                    onSort={changeList.toggleSort}
                  />
                  <SortableTh
                    label="Acción"
                    columnKey="action"
                    activeKey={changeList.sortKey}
                    direction={changeList.sortDir}
                    onSort={changeList.toggleSort}
                  />
                  <SortableTh
                    label="Detalle"
                    columnKey="details"
                    activeKey={changeList.sortKey}
                    direction={changeList.sortDir}
                    onSort={changeList.toggleSort}
                  />
                  <SortableTh
                    label="Serial"
                    columnKey="serial"
                    activeKey={changeList.sortKey}
                    direction={changeList.sortDir}
                    onSort={changeList.toggleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {changeList.pageItems.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge tone="info">{item.action}</Badge>
                    </td>
                    <td className="px-4 py-3">{item.details}</td>
                    <td className="px-4 py-3">
                      {item.asset?.serialNumber || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="space-y-2">
            {changeList.pageItems.map((item) => (
              <Card key={item.id} className="!p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <Badge tone="info">{item.action}</Badge>
                      <span className="text-xs text-[var(--muted)]">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--ink)]">{item.details}</p>
                  </div>
                  {item.asset && (
                    <p className="text-xs text-[var(--muted)]">
                      {item.asset.serialNumber}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
        <ListFooter
          page={changeList.page}
          totalPages={changeList.totalPages}
          onPageChange={changeList.setPage}
          showingFrom={changeList.showingFrom}
          showingTo={changeList.showingTo}
          total={changeList.total}
        />
      </section>
    </div>
  );
}
