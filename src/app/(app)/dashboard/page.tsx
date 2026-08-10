"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Box,
  MonitorCheck,
  PackageOpen,
  ShieldOff,
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
  };
};

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#0ea5e9",
  "#65a30d",
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
    sortFn: (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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
      className: "stagger-1",
    },
    {
      label: "Cambios recientes",
      value: data.cards.recentChanges,
      icon: Activity,
      href: "/dashboard#cambios",
      className: "stagger-2",
    },
    {
      label: "Activos sin asignar",
      value: data.cards.activeUnassigned,
      icon: PackageOpen,
      href: "/inventario?unassigned=1",
      className: "stagger-3",
    },
    {
      label: "Equipos totales",
      value: data.cards.total,
      icon: Box,
      href: "/inventario",
      className: "stagger-4",
    },
    {
      label: "Equipos deshabilitados",
      value: data.cards.disabled,
      icon: ShieldOff,
      href: "/inventario?status=Inactivo",
      className: "stagger-5",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Resumen operativo del inventario IT. Haz clic en una tarjeta para filtrar."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className={`animate-rise ${card.className}`}
              onClick={() => router.push(card.href)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {card.label}
                  </p>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--ink)]">
                    {card.value}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--accent-soft)] p-2 text-[var(--accent-strong)]">
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card
          className="animate-rise"
          onClick={() => router.push("/stock")}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Stock en reserva
          </p>
          <p className="mt-2 text-3xl font-semibold">{data.cards.stock}</p>
        </Card>
        <Card
          className="animate-rise"
          onClick={() => router.push("/ciclo-vida")}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Renovaciones próximas
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {data.cards.renewalsDue}
          </p>
        </Card>
        <Card
          className="animate-rise"
          onClick={() => router.push("/ciclo-vida")}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Mantenimientos próximos
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {data.cards.maintenancesDue}
          </p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card className="animate-fade">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl">
            Equipos por categoría
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="animate-fade">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl">
            Distribución por estado
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.charts.byStatus}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={95}
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
      </div>

      <div className="animate-fade mt-6" id="cambios">
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
        />
        {changeList.total === 0 ? (
          <EmptyState text="Sin cambios para mostrar." />
        ) : changeList.view === "list" ? (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-2)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Acción</th>
                  <th className="px-4 py-3 text-left">Detalle</th>
                  <th className="px-4 py-3 text-left">Serial</th>
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
          <div className="space-y-3">
            {changeList.pageItems.map((item) => (
              <Card key={item.id}>
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
      </div>
    </div>
  );
}
