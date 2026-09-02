"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
} from "@/components/ui";
import { ListFooter, ListToolbar } from "@/components/ListToolbar";
import { SortableTh } from "@/components/SortableTh";
import { useListControls } from "@/hooks/useListControls";
import { formatDate } from "@/lib/utils";

type Renewal = {
  id: string;
  name: string;
  category: string;
  serialNumber: string;
  purchaseDate: string;
  renewalDate: string;
  status: string;
  daysToRenewal: number;
  renewalStatus: string;
  assignments: Array<{ employee: { name: string } }>;
};

type Maintenance = {
  id: string;
  scheduledDate: string;
  completedDate: string | null;
  status: string;
  notes: string | null;
  asset: {
    id: string;
    name: string;
    category: string;
    serialNumber: string;
    assignments: Array<{ employee: { name: string } }>;
  };
};

export default function CicloVidaPage() {
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [summary, setSummary] = useState({ maintenanceDue: 0, renewalsDue: 0 });

  async function load() {
    const [lifeRes, meRes] = await Promise.all([
      fetch("/api/maintenance?lifecycle=1"),
      fetch("/api/auth/me"),
    ]);
    const life = await lifeRes.json();
    const me = await meRes.json();
    setRenewals(life.renewals || []);
    setMaintenances(
      (life.maintenances || []).filter((m: Maintenance) => !m.completedDate)
    );
    setSummary(life.summary || { maintenanceDue: 0, renewalsDue: 0 });
    setRole(me.user?.role || "USER");
  }

  useEffect(() => {
    load();
  }, []);

  async function completeMaintenance(id: string) {
    const res = await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "complete" }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo completar");
      return;
    }
    await load();
  }

  async function confirmInactive(item: Renewal) {
    if (item.renewalStatus !== "Vencido") return;
    const ok = confirm(
      `¿Confirmar que "${item.name}" (${item.serialNumber}) queda inactiva?\nDejará de aparecer en renovaciones y mantenimiento.`
    );
    if (!ok) return;

    const res = await fetch("/api/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "confirmInactive",
        assetId: item.id,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo confirmar");
      return;
    }
    await load();
  }

  function renewalTone(status: string) {
    if (status === "Vencido") return "danger" as const;
    if (status === "Por renovar") return "warn" as const;
    return "success" as const;
  }

  const renewalList = useListControls(renewals, {
    storageKey: "ciclo-renovaciones-p25",
    defaultView: "list",
    getName: (r) => r.name,
    getSerial: (r) => r.serialNumber,
    defaultSortKey: "daysToRenewal",
    defaultSortDir: "asc",
    sortFields: {
      name: { label: "Equipo", getValue: (r) => r.name },
      serial: { label: "Serial", getValue: (r) => r.serialNumber },
      renewalDate: {
        label: "Renovación",
        getValue: (r) => new Date(r.renewalDate).getTime(),
      },
      renewalStatus: {
        label: "Estado",
        getValue: (r) => r.renewalStatus,
      },
      daysToRenewal: {
        label: "Días",
        getValue: (r) => r.daysToRenewal,
      },
    },
  });

  const maintList = useListControls(maintenances, {
    storageKey: "ciclo-mantenimientos-p25",
    defaultView: "list",
    getName: (m) => m.asset.name,
    getSerial: (m) => m.asset.serialNumber,
    defaultSortKey: "scheduledDate",
    defaultSortDir: "asc",
    sortFields: {
      name: { label: "Equipo", getValue: (m) => m.asset.name },
      serial: {
        label: "Serial",
        getValue: (m) => m.asset.serialNumber,
      },
      scheduledDate: {
        label: "Programado",
        getValue: (m) => new Date(m.scheduledDate).getTime(),
      },
      status: { label: "Estado", getValue: (m) => m.status },
    },
  });

  return (
    <div>
      <PageHeader
        title="Ciclo de vida"
        subtitle="Solo laptops activas/stock/reparación: renovación a 4 años y mantenimiento cada 6 meses. Las inactivas no se incluyen. En vencidos puedes confirmarlas como inactivas."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card className="animate-rise">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Renovaciones de laptops
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl">
            {summary.renewalsDue}
          </p>
        </Card>
        <Card className="animate-rise stagger-1">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Mantenimientos de laptops
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl">
            {summary.maintenanceDue}
          </p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl">
            Renovación de laptops (4 años)
          </h2>
          <ListToolbar
            name={renewalList.name}
            serial={renewalList.serial}
            onNameChange={renewalList.setName}
            onSerialChange={renewalList.setSerial}
            view={renewalList.view}
            onViewChange={renewalList.setView}
            page={renewalList.page}
            totalPages={renewalList.totalPages}
            onPageChange={renewalList.setPage}
            showingFrom={renewalList.showingFrom}
            showingTo={renewalList.showingTo}
            total={renewalList.total}
            sortOptions={renewalList.sortOptions}
            sortKey={renewalList.sortKey}
            sortDir={renewalList.sortDir}
            onSortChange={renewalList.setSort}
          />
          {renewalList.total === 0 ? (
            <EmptyState text="Sin equipos para renovación." />
          ) : renewalList.view === "grid" ? (
            <div className="space-y-3">
              {renewalList.pageItems.map((item) => (
                <Card key={item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {item.category} · {item.serialNumber}
                      </p>
                    </div>
                    <Badge tone={renewalTone(item.renewalStatus)}>
                      {item.renewalStatus}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <p>
                      <span className="text-[var(--muted)]">Compra: </span>
                      {formatDate(item.purchaseDate)}
                    </p>
                    <p>
                      <span className="text-[var(--muted)]">Renovación: </span>
                      {formatDate(item.renewalDate)}
                    </p>
                    <p>
                      <span className="text-[var(--muted)]">Días: </span>
                      {item.daysToRenewal}
                    </p>
                    <p>
                      <span className="text-[var(--muted)]">Asignado: </span>
                      {item.assignments[0]?.employee.name || "—"}
                    </p>
                  </div>
                  {role === "ADMIN" && item.renewalStatus === "Vencido" && (
                    <Button
                      className="mt-3"
                      variant="secondary"
                      onClick={() => confirmInactive(item)}
                    >
                      Confirmar como inactiva
                    </Button>
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
                      label="Equipo"
                      columnKey="name"
                      activeKey={renewalList.sortKey}
                      direction={renewalList.sortDir}
                      onSort={renewalList.toggleSort}
                    />
                    <SortableTh
                      label="Serial"
                      columnKey="serial"
                      activeKey={renewalList.sortKey}
                      direction={renewalList.sortDir}
                      onSort={renewalList.toggleSort}
                    />
                    <SortableTh
                      label="Renovación"
                      columnKey="renewalDate"
                      activeKey={renewalList.sortKey}
                      direction={renewalList.sortDir}
                      onSort={renewalList.toggleSort}
                    />
                    <SortableTh
                      label="Estado"
                      columnKey="renewalStatus"
                      activeKey={renewalList.sortKey}
                      direction={renewalList.sortDir}
                      onSort={renewalList.toggleSort}
                    />
                    {role === "ADMIN" && (
                      <th className="px-4 py-3 text-left">Acción</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {renewalList.pageItems.map((item) => (
                    <tr key={item.id} className="border-t border-[var(--border)]">
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3">{item.serialNumber}</td>
                      <td className="px-4 py-3">{formatDate(item.renewalDate)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={renewalTone(item.renewalStatus)}>
                          {item.renewalStatus}
                        </Badge>
                      </td>
                      {role === "ADMIN" && (
                        <td className="px-4 py-3">
                          {item.renewalStatus === "Vencido" ? (
                            <Button
                              className="px-2 py-1"
                              variant="secondary"
                              onClick={() => confirmInactive(item)}
                            >
                              Confirmar inactiva
                            </Button>
                          ) : (
                            <span className="text-xs text-[var(--muted)]">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <ListFooter
            page={renewalList.page}
            totalPages={renewalList.totalPages}
            onPageChange={renewalList.setPage}
            showingFrom={renewalList.showingFrom}
            showingTo={renewalList.showingTo}
            total={renewalList.total}
          />
        </section>

        <section>
          <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl">
            Mantenimiento de laptops (6 meses)
          </h2>
          <ListToolbar
            name={maintList.name}
            serial={maintList.serial}
            onNameChange={maintList.setName}
            onSerialChange={maintList.setSerial}
            view={maintList.view}
            onViewChange={maintList.setView}
            page={maintList.page}
            totalPages={maintList.totalPages}
            onPageChange={maintList.setPage}
            showingFrom={maintList.showingFrom}
            showingTo={maintList.showingTo}
            total={maintList.total}
            sortOptions={maintList.sortOptions}
            sortKey={maintList.sortKey}
            sortDir={maintList.sortDir}
            onSortChange={maintList.setSort}
          />
          {maintList.total === 0 ? (
            <EmptyState text="No hay mantenimientos pendientes." />
          ) : maintList.view === "grid" ? (
            <div className="space-y-3">
              {maintList.pageItems.map((item) => (
                <Card key={item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{item.asset.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {item.asset.category} · {item.asset.serialNumber}
                      </p>
                    </div>
                    <Badge tone={item.status === "Próximo" ? "warn" : "info"}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div>
                      <p>
                        <span className="text-[var(--muted)]">Programado: </span>
                        {formatDate(item.scheduledDate)}
                      </p>
                      <p>
                        <span className="text-[var(--muted)]">Usuario: </span>
                        {item.asset.assignments[0]?.employee.name || "—"}
                      </p>
                    </div>
                    {role === "ADMIN" && (
                      <Button onClick={() => completeMaintenance(item.id)}>
                        Marcar completado
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="table-shell">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--surface-2)] text-xs uppercase text-[var(--muted)]">
                  <tr>
                    <SortableTh
                      label="Equipo"
                      columnKey="name"
                      activeKey={maintList.sortKey}
                      direction={maintList.sortDir}
                      onSort={maintList.toggleSort}
                    />
                    <SortableTh
                      label="Serial"
                      columnKey="serial"
                      activeKey={maintList.sortKey}
                      direction={maintList.sortDir}
                      onSort={maintList.toggleSort}
                    />
                    <SortableTh
                      label="Programado"
                      columnKey="scheduledDate"
                      activeKey={maintList.sortKey}
                      direction={maintList.sortDir}
                      onSort={maintList.toggleSort}
                    />
                    <SortableTh
                      label="Estado"
                      columnKey="status"
                      activeKey={maintList.sortKey}
                      direction={maintList.sortDir}
                      onSort={maintList.toggleSort}
                    />
                    {role === "ADMIN" && (
                      <th className="px-4 py-3 text-left">Acción</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {maintList.pageItems.map((item) => (
                    <tr key={item.id} className="border-t border-[var(--border)]">
                      <td className="px-4 py-3">{item.asset.name}</td>
                      <td className="px-4 py-3">{item.asset.serialNumber}</td>
                      <td className="px-4 py-3">
                        {formatDate(item.scheduledDate)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={item.status === "Próximo" ? "warn" : "info"}>
                          {item.status}
                        </Badge>
                      </td>
                      {role === "ADMIN" && (
                        <td className="px-4 py-3">
                          <Button
                            className="px-2 py-1"
                            onClick={() => completeMaintenance(item.id)}
                          >
                            Completar
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <ListFooter
            page={maintList.page}
            totalPages={maintList.totalPages}
            onPageChange={maintList.setPage}
            showingFrom={maintList.showingFrom}
            showingTo={maintList.showingTo}
            total={maintList.total}
          />
        </section>
      </div>
    </div>
  );
}
