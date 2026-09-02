"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Package } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Label,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import { ListFooter, ListToolbar } from "@/components/ListToolbar";
import { useListControls } from "@/hooks/useListControls";
import { formatDate } from "@/lib/utils";

type Employee = { id: string; name: string; active?: boolean };
type Asset = {
  id: string;
  name: string;
  serialNumber: string;
  category: string;
  status: string;
};
type Assignment = {
  id: string;
  assignedAt: string;
  unassignedAt: string | null;
  notes: string | null;
  asset: Asset;
  employee: { id: string; name: string; position?: { name: string } | null };
};

type UserGroup = {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  assignments: Assignment[];
  count: number;
  latestAssignedAt: number;
};

function groupByUser(items: Assignment[]): UserGroup[] {
  const map = new Map<string, UserGroup>();
  for (const a of items) {
    const key = a.employee.id;
    const existing = map.get(key);
    if (existing) {
      existing.assignments.push(a);
      existing.count += 1;
      existing.latestAssignedAt = Math.max(
        existing.latestAssignedAt,
        new Date(a.assignedAt).getTime()
      );
    } else {
      map.set(key, {
        id: key,
        employeeId: a.employee.id,
        employeeName: a.employee.name,
        position: a.employee.position?.name || "Sin puesto",
        assignments: [a],
        count: 1,
        latestAssignedAt: new Date(a.assignedAt).getTime(),
      });
    }
  }
  for (const g of map.values()) {
    g.assignments.sort(
      (a, b) =>
        new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
    );
  }
  return [...map.values()].sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName, "es", { sensitivity: "base" })
  );
}

function UserAssignmentGroup({
  group,
  role,
  onUnassign,
  defaultOpen,
  showHistoryDates,
}: {
  group: UserGroup;
  role: "ADMIN" | "USER";
  onUnassign?: (id: string) => void;
  defaultOpen?: boolean;
  showHistoryDates?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? group.count > 1);

  return (
    <Card className="!p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[var(--surface-2)]"
      >
        <span className="text-[var(--muted)]">
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-[var(--ink)]">
              {group.employeeName}
            </p>
            <Badge tone={group.count > 1 ? "info" : "neutral"}>
              {group.count} equipo{group.count === 1 ? "" : "s"}
            </Badge>
          </div>
          <p className="text-xs text-[var(--muted)]">{group.position}</p>
        </div>
        {!open && (
          <p className="hidden max-w-[40%] truncate text-xs text-[var(--muted)] sm:block">
            {group.assignments.map((a) => a.asset.name).join(" · ")}
          </p>
        )}
      </button>

      {open && (
        <div className="border-t border-[var(--border)] bg-[var(--surface-2)]/50">
          <ul className="divide-y divide-[var(--border)]">
            {group.assignments.map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <Package className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--ink)]">
                      {a.asset.name}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {a.asset.category} · {a.asset.serialNumber}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {showHistoryDates ? (
                        <>
                          {formatDate(a.assignedAt)}
                          {a.unassignedAt
                            ? ` → ${formatDate(a.unassignedAt)}`
                            : " (vigente)"}
                        </>
                      ) : (
                        <>Desde {formatDate(a.assignedAt)}</>
                      )}
                    </p>
                    {a.notes && (
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {a.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                  <Badge tone={a.unassignedAt ? "neutral" : "success"}>
                    {a.unassignedAt ? "Histórica" : "Activa"}
                  </Badge>
                  {role === "ADMIN" && onUnassign && !a.unassignedAt && (
                    <Button
                      variant="secondary"
                      className="px-2.5 py-1.5"
                      onClick={() => onUnassign(a.id)}
                    >
                      Liberar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export default function AsignacionesPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [history, setHistory] = useState<Assignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [assetId, setAssetId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const [aRes, hRes, eRes, asRes, meRes] = await Promise.all([
      fetch("/api/assignments"),
      fetch("/api/assignments?history=1"),
      fetch("/api/employees"),
      fetch("/api/assets"),
      fetch("/api/auth/me"),
    ]);
    const [a, h, e, as, me] = await Promise.all([
      aRes.json(),
      hRes.json(),
      eRes.json(),
      asRes.json(),
      meRes.json(),
    ]);
    setAssignments(a.assignments || []);
    setHistory(h.assignments || []);
    setEmployees(
      (e.employees || []).filter((emp: Employee) => emp.active !== false)
    );
    setAssets(
      (as.assets || []).filter(
        (x: Asset) => x.status === "Activo" || x.status === "Stock"
      )
    );
    setRole(me.user?.role || "USER");
  }

  useEffect(() => {
    load();
  }, []);

  async function onAssign(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId, employeeId, notes }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo asignar");
      return;
    }
    setAssetId("");
    setEmployeeId("");
    setNotes("");
    await load();
  }

  async function unassign(id: string) {
    if (!confirm("¿Liberar esta asignación?")) return;
    const res = await fetch(`/api/assignments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: "Liberado desde panel" }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo liberar");
      return;
    }
    await load();
  }

  const activeGroups = useMemo(
    () => groupByUser(assignments),
    [assignments]
  );
  const historyGroups = useMemo(() => groupByUser(history), [history]);

  const activeList = useListControls(activeGroups, {
    storageKey: "asignaciones-grupos-p25",
    defaultView: "list",
    pageSize: 15,
    getName: (g) =>
      `${g.employeeName} ${g.position} ${g.assignments
        .map((a) => a.asset.name)
        .join(" ")}`,
    getSerial: (g) =>
      g.assignments.map((a) => a.asset.serialNumber).join(" "),
    defaultSortKey: "employee",
    sortFields: {
      employee: { label: "Usuario", getValue: (g) => g.employeeName },
      count: { label: "Equipos", getValue: (g) => g.count },
      recent: {
        label: "Más reciente",
        getValue: (g) => g.latestAssignedAt,
      },
    },
  });

  const historyList = useListControls(historyGroups, {
    storageKey: "asignaciones-hist-grupos-p25",
    defaultView: "list",
    pageSize: 15,
    getName: (g) =>
      `${g.employeeName} ${g.assignments.map((a) => a.asset.name).join(" ")}`,
    getSerial: (g) =>
      g.assignments.map((a) => a.asset.serialNumber).join(" "),
    defaultSortKey: "recent",
    defaultSortDir: "desc",
    sortFields: {
      employee: { label: "Usuario", getValue: (g) => g.employeeName },
      count: { label: "Equipos", getValue: (g) => g.count },
      recent: {
        label: "Más reciente",
        getValue: (g) => g.latestAssignedAt,
      },
    },
  });

  const multiCount = activeGroups.filter((g) => g.count > 1).length;

  return (
    <div>
      <PageHeader
        title="Asignaciones"
        subtitle="Agrupadas por usuario para ver de un vistazo todos sus equipos."
      />

      {role === "ADMIN" && (
        <Card className="mb-6 animate-rise">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl">
            Nueva asignación
          </h2>
          <form onSubmit={onAssign} className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Equipo / complemento</Label>
              <Select
                required
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
              >
                <option value="">Selecciona</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} · {a.serialNumber} ({a.category})
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Usuario</Label>
              <Select
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <option value="">Selecciona</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Notas</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            <div className="md:col-span-2">
              <Button type="submit">Asignar</Button>
            </div>
          </form>
        </Card>
      )}

      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              Asignaciones activas
            </h2>
            <p className="text-xs text-[var(--muted)]">
              {activeGroups.length} usuario
              {activeGroups.length === 1 ? "" : "s"} · {assignments.length}{" "}
              equipo{assignments.length === 1 ? "" : "s"}
              {multiCount > 0
                ? ` · ${multiCount} con varios equipos`
                : ""}
            </p>
          </div>
        </div>

        <ListToolbar
          name={activeList.name}
          serial={activeList.serial}
          onNameChange={activeList.setName}
          onSerialChange={activeList.setSerial}
          view={activeList.view}
          onViewChange={activeList.setView}
          page={activeList.page}
          totalPages={activeList.totalPages}
          onPageChange={activeList.setPage}
          showingFrom={activeList.showingFrom}
          showingTo={activeList.showingTo}
          total={activeList.total}
          namePlaceholder="Buscar usuario o equipo..."
          serialPlaceholder="Serial..."
          sortOptions={activeList.sortOptions}
          sortKey={activeList.sortKey}
          sortDir={activeList.sortDir}
          onSortChange={activeList.setSort}
        />

        {activeList.total === 0 ? (
          <EmptyState text="No hay asignaciones activas." />
        ) : (
          <div className="space-y-3">
            {activeList.pageItems.map((group) => (
              <UserAssignmentGroup
                key={group.id}
                group={group}
                role={role}
                onUnassign={unassign}
                defaultOpen={group.count > 1 || activeList.view === "grid"}
              />
            ))}
          </div>
        )}

        <ListFooter
          page={activeList.page}
          totalPages={activeList.totalPages}
          onPageChange={activeList.setPage}
          showingFrom={activeList.showingFrom}
          showingTo={activeList.showingTo}
          total={activeList.total}
        />
      </section>

      <section>
        <div className="mb-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Historial por usuario
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Incluye asignaciones activas e históricas, agrupadas por persona
          </p>
        </div>
        <ListToolbar
          name={historyList.name}
          serial={historyList.serial}
          onNameChange={historyList.setName}
          onSerialChange={historyList.setSerial}
          view={historyList.view}
          onViewChange={historyList.setView}
          page={historyList.page}
          totalPages={historyList.totalPages}
          onPageChange={historyList.setPage}
          showingFrom={historyList.showingFrom}
          showingTo={historyList.showingTo}
          total={historyList.total}
          namePlaceholder="Buscar usuario o equipo..."
          serialPlaceholder="Serial..."
          sortOptions={historyList.sortOptions}
          sortKey={historyList.sortKey}
          sortDir={historyList.sortDir}
          onSortChange={historyList.setSort}
        />
        {historyList.total === 0 ? (
          <EmptyState text="Sin historial." />
        ) : (
          <div className="space-y-3">
            {historyList.pageItems.map((group) => (
              <UserAssignmentGroup
                key={group.id}
                group={group}
                role={role}
                defaultOpen={false}
                showHistoryDates
              />
            ))}
          </div>
        )}
        <ListFooter
          page={historyList.page}
          totalPages={historyList.totalPages}
          onPageChange={historyList.setPage}
          showingFrom={historyList.showingFrom}
          showingTo={historyList.showingTo}
          total={historyList.total}
        />
      </section>
    </div>
  );
}
