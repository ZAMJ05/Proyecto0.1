"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Box,
  Laptop,
  MonitorCheck,
  PackageOpen,
  RefreshCw,
  ShieldOff,
  Warehouse,
  Wrench,
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

const STATUS_COLORS: Record<string, string> = {
  Activo: "var(--badge-success-fg)",
  Activas: "var(--badge-success-fg)",
  Stock: "var(--badge-info-fg)",
  Reparacion: "var(--badge-warn-fg)",
  "Reparación": "var(--badge-warn-fg)",
  Inactivo: "var(--badge-danger-fg)",
  Inactivas: "var(--badge-danger-fg)",
};

const CHART_FALLBACK = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function colorFor(name: string, index: number) {
  return STATUS_COLORS[name] || CHART_FALLBACK[index % CHART_FALLBACK.length];
}

function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (reduced.current || target === 0) {
      setValue(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function Count({ n, className }: { n: number; className?: string }) {
  const v = useCountUp(n);
  return <span className={className}>{v}</span>;
}

function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function StackBar({
  segments,
  onSegmentClick,
}: {
  segments: Array<{
    key: string;
    label: string;
    value: number;
    color: string;
    href: string;
  }>;
  onSegmentClick: (href: string) => void;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-[var(--surface-2)]">
        {segments.map((seg) =>
          seg.value <= 0 ? null : (
            <button
              key={seg.key}
              type="button"
              title={`${seg.label}: ${seg.value}`}
              onClick={() => onSegmentClick(seg.href)}
              className="h-full transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={{
                width: `${(seg.value / total) * 100}%`,
                background: seg.color,
                minWidth: seg.value > 0 ? 6 : 0,
              }}
            />
          ),
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {segments.map((seg) => (
          <button
            key={seg.key}
            type="button"
            onClick={() => onSegmentClick(seg.href)}
            className="inline-flex items-center gap-2 text-sm transition hover:opacity-80"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: seg.color }}
            />
            <span className="text-[var(--muted)]">{seg.label}</span>
            <span className="font-semibold text-[var(--ink)]">{seg.value}</span>
            <span className="text-xs text-[var(--muted)]">
              {pct(seg.value, total)}%
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChartLegend({
  items,
}: {
  items: Array<{ name: string; value: number; color: string }>;
}) {
  const total = items.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((item) => (
        <li
          key={item.name}
          className="flex items-center justify-between gap-2 text-sm"
        >
          <span className="inline-flex items-center gap-2 text-[var(--muted)]">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: item.color }}
            />
            {item.name}
          </span>
          <span className="tabular-nums font-semibold text-[var(--ink)]">
            {item.value}
            <span className="ml-1 text-xs font-normal text-[var(--muted)]">
              {pct(item.value, total)}%
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

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

  const statusSegments = useMemo(() => {
    if (!data) return [];
    return [
      {
        key: "activo",
        label: "Activo",
        value: data.cards.active,
        color: "var(--badge-success-fg)",
        href: "/activos",
      },
      {
        key: "stock",
        label: "Stock",
        value: data.cards.stock,
        color: "var(--badge-info-fg)",
        href: "/stock",
      },
      {
        key: "reparacion",
        label: "Reparación",
        value: data.cards.reparacion,
        color: "var(--badge-warn-fg)",
        href: "/inventario?status=Reparacion",
      },
      {
        key: "inactivo",
        label: "Inactivo",
        value: data.cards.disabled,
        color: "var(--badge-danger-fg)",
        href: "/inventario?status=Inactivo",
      },
    ];
  }, [data]);

  if (!data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-48 rounded-xl bg-[var(--surface-2)]" />
        <div className="h-24 rounded-2xl bg-[var(--surface-2)]" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="h-48 rounded-2xl bg-[var(--surface-2)]" />
          <div className="h-48 rounded-2xl bg-[var(--surface-2)]" />
        </div>
      </div>
    );
  }

  const alerts = [
    {
      key: "renewals",
      label: "Renovación laptops",
      value: data.cards.renewalsDue,
      href: "/ciclo-vida",
      icon: RefreshCw,
      tone: "warn" as const,
      hint: "Próximas o vencidas (90 días)",
    },
    {
      key: "maint",
      label: "Mantenimiento",
      value: data.cards.maintenancesDue,
      href: "/ciclo-vida",
      icon: Wrench,
      tone: "warn" as const,
      hint: "Pendiente en laptops",
    },
    {
      key: "unassigned",
      label: "Activos sin asignar",
      value: data.cards.activeUnassigned,
      href: "/activos?unassigned=1",
      icon: PackageOpen,
      tone: "info" as const,
      hint: "En estado Activo sin usuario",
    },
    {
      key: "repair",
      label: "En reparación",
      value: data.cards.reparacion,
      href: "/inventario?status=Reparacion",
      icon: AlertTriangle,
      tone: "danger" as const,
      hint: "Equipos fuera de operación",
    },
  ].filter((a) => a.value > 0);

  const laptopActivePct = pct(
    data.cards.laptops.active,
    data.cards.laptops.tracked,
  );
  const laptopInactivePct = pct(
    data.cards.laptops.inactive,
    data.cards.laptops.tracked,
  );

  const laptopLegend = data.charts.laptopsByStatus.map((item, i) => ({
    ...item,
    color: colorFor(item.name, i),
  }));
  const statusLegend = data.charts.byStatus.map((item, i) => ({
    ...item,
    color: colorFor(item.name, i),
  }));
  const categoryLegend = data.charts.byCategory.map((item, i) => ({
    ...item,
    color: CHART_FALLBACK[i % CHART_FALLBACK.length],
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Estado del inventario de un vistazo. Toca cualquier número para ir al detalle."
      />

      {/* Atención inmediata */}
      <section className="animate-rise">
        {alerts.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
            <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5">
              <AlertTriangle className="h-4 w-4 text-[var(--badge-warn-fg)]" />
              <h2 className="text-sm font-semibold text-[var(--ink)]">
                Requiere atención
              </h2>
              <span className="text-xs text-[var(--muted)]">
                {alerts.length} alerta{alerts.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4">
              {alerts.map((alert, i) => {
                const Icon = alert.icon;
                return (
                  <button
                    key={alert.key}
                    type="button"
                    onClick={() => router.push(alert.href)}
                    className={`group flex items-start gap-3 px-4 py-4 text-left transition hover:bg-[var(--accent-soft)] ${
                      i > 0 ? "border-t border-[var(--border)] sm:border-t-0 sm:border-l" : ""
                    } ${i === 2 ? "xl:border-l" : ""} ${i === 1 || i === 3 ? "sm:border-l" : ""}`}
                  >
                    <div className="rounded-xl bg-[var(--accent-soft)] p-2 text-[var(--accent-strong)] transition group-hover:scale-105">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[var(--muted)]">{alert.label}</p>
                      <p className="font-[family-name:var(--font-display)] text-3xl tabular-nums text-[var(--ink)]">
                        <Count n={alert.value} />
                      </p>
                      <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                        {alert.hint}
                      </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--muted)] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--badge-success-bg)] px-4 py-3 text-sm text-[var(--badge-success-fg)]">
            <MonitorCheck className="h-5 w-5 shrink-0" />
            <span>
              Sin alertas urgentes: renovaciones, mantenimientos y reparaciones
              bajo control.
            </span>
          </div>
        )}
      </section>

      {/* Inventario general */}
      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Card className="animate-rise stagger-1 !p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Inventario
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <Count
                  n={data.cards.total}
                  className="font-[family-name:var(--font-display)] text-5xl tabular-nums text-[var(--ink)]"
                />
                <span className="text-sm text-[var(--muted)]">
                  equipos (sin baja)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push("/inventario")}
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-strong)] hover:underline"
            >
              Ver inventario <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <StackBar
            segments={statusSegments}
            onSegmentClick={(href) => router.push(href)}
          />
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              {
                label: "Activos",
                value: data.cards.active,
                icon: MonitorCheck,
                href: "/activos",
              },
              {
                label: "Stock",
                value: data.cards.stock,
                icon: Warehouse,
                href: "/stock",
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
            ].map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => router.push(m.href)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-left transition hover:border-[var(--accent)]"
                >
                  <div className="mb-1 flex items-center gap-1.5 text-[var(--muted)]">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-medium uppercase tracking-wide">
                      {m.label}
                    </span>
                  </div>
                  <Count
                    n={m.value}
                    className="font-[family-name:var(--font-display)] text-2xl tabular-nums text-[var(--ink)]"
                  />
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="animate-rise stagger-2 flex flex-col justify-between !p-5">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-xl bg-[var(--accent-soft)] p-2 text-[var(--accent-strong)]">
                <Laptop className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
                  Laptops
                </h2>
                <p className="text-xs text-[var(--muted)]">
                  {data.cards.laptops.tracked} en seguimiento
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  router.push("/inventario?category=Laptop&status=Activo")
                }
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-left transition hover:border-[var(--accent)]"
              >
                <p className="text-xs text-[var(--muted)]">Activas</p>
                <Count
                  n={data.cards.laptops.active}
                  className="font-[family-name:var(--font-display)] text-4xl tabular-nums text-[var(--badge-success-fg)]"
                />
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {laptopActivePct}% del total
                </p>
              </button>
              <button
                type="button"
                onClick={() =>
                  router.push("/inventario?category=Laptop&status=Inactivo")
                }
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-left transition hover:border-[var(--accent)]"
              >
                <p className="text-xs text-[var(--muted)]">Inactivas</p>
                <Count
                  n={data.cards.laptops.inactive}
                  className="font-[family-name:var(--font-display)] text-4xl tabular-nums text-[var(--badge-danger-fg)]"
                />
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {laptopInactivePct}% del total
                </p>
              </button>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div
                className="h-full rounded-full bg-[var(--badge-success-fg)] transition-all duration-700"
                style={{ width: `${laptopActivePct}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-[var(--muted)]">
              Ratio operativas vs inactivas
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                router.push("/inventario?category=Laptop&status=Stock")
              }
              className="rounded-xl border border-[var(--border)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
            >
              <span className="text-[var(--muted)]">Stock</span>
              <span className="ml-2 font-semibold tabular-nums text-[var(--ink)]">
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
              <span className="ml-2 font-semibold tabular-nums text-[var(--ink)]">
                {data.cards.laptops.reparacion}
              </span>
            </button>
          </div>
        </Card>
      </section>

      {/* Gráficas con leyenda legible */}
      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="animate-fade">
          <h2 className="mb-1 font-[family-name:var(--font-display)] text-lg">
            Laptops por estado
          </h2>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Distribución visual + cifras
          </p>
          <div className="grid grid-cols-[1fr_1fr] items-center gap-2">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={laptopLegend}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={42}
                    outerRadius={68}
                    paddingAngle={3}
                  >
                    {laptopLegend.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ChartLegend items={laptopLegend} />
          </div>
        </Card>

        <Card className="animate-fade">
          <h2 className="mb-1 font-[family-name:var(--font-display)] text-lg">
            Por categoría
          </h2>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Qué tipo de equipo hay más
          </p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.charts.byCategory}
                layout="vertical"
                margin={{ left: 8, right: 8, top: 4, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--chart-grid)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: "var(--muted)" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={72}
                  tick={{ fontSize: 10, fill: "var(--muted)" }}
                />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {categoryLegend.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="animate-fade">
          <h2 className="mb-1 font-[family-name:var(--font-display)] text-lg">
            Por estado
          </h2>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Todo el inventario (sin baja)
          </p>
          <div className="grid grid-cols-[1fr_1fr] items-center gap-2">
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusLegend}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={42}
                    outerRadius={68}
                    paddingAngle={3}
                  >
                    {statusLegend.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ChartLegend items={statusLegend} />
          </div>
        </Card>
      </section>

      {/* Accesos rápidos */}
      <section className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Ir a Stock",
            value: data.cards.stock,
            desc: "Equipos en reserva",
            href: "/stock",
            icon: Box,
            stagger: "stagger-1",
          },
          {
            label: "Ciclo de vida",
            value: data.cards.renewalsDue + data.cards.maintenancesDue,
            desc: "Renovaciones + mantenimientos",
            href: "/ciclo-vida",
            icon: RefreshCw,
            stagger: "stagger-2",
          },
          {
            label: "Asignaciones",
            value: data.cards.activeUnassigned,
            desc: "Activos pendientes de usuario",
            href: "/asignaciones",
            icon: PackageOpen,
            stagger: "stagger-3",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.label}
              className={`animate-rise ${item.stagger}`}
              onClick={() => router.push(item.href)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[var(--accent-soft)] p-2.5 text-[var(--accent-strong)]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {item.label}
                    </p>
                    <p className="text-xs text-[var(--muted)]">{item.desc}</p>
                  </div>
                </div>
                <span className="font-[family-name:var(--font-display)] text-2xl tabular-nums text-[var(--ink)]">
                  {item.value}
                </span>
              </div>
            </Card>
          );
        })}
      </section>

      <section className="animate-fade" id="cambios">
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-xl">
              Actividad reciente
            </h2>
            <p className="text-xs text-[var(--muted)]">
              Últimos movimientos del inventario
            </p>
          </div>
        </div>
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
          <div className="relative space-y-0 pl-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-[var(--border)]">
            {changeList.pageItems.map((item) => (
              <div key={item.id} className="relative pb-3 pl-5">
                <span className="absolute left-0 top-2 h-3.5 w-3.5 rounded-full border-2 border-[var(--accent)] bg-[var(--surface)]" />
                <Card className="!p-3">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge tone="info">{item.action}</Badge>
                        <span className="text-xs text-[var(--muted)]">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--ink)]">{item.details}</p>
                    </div>
                    {item.asset && (
                      <p className="text-xs tabular-nums text-[var(--muted)]">
                        {item.asset.serialNumber}
                      </p>
                    )}
                  </div>
                </Card>
              </div>
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
