"use client";

import { FormEvent, useEffect, useState } from "react";
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

type Employee = { id: string; name: string };
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
    setEmployees(e.employees || []);
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

  const activeList = useListControls(assignments, {
    storageKey: "asignaciones-activas-p25",
    defaultView: "list",
    getName: (a) => `${a.employee.name} ${a.asset.name}`,
    getSerial: (a) => a.asset.serialNumber,
    sortFn: (a, b) =>
      a.employee.name.localeCompare(b.employee.name, "es") ||
      a.asset.name.localeCompare(b.asset.name, "es"),
  });

  const historyList = useListControls(history, {
    storageKey: "asignaciones-historial-p25",
    defaultView: "list",
    getName: (a) => `${a.employee.name} ${a.asset.name}`,
    getSerial: (a) => a.asset.serialNumber,
    sortFn: (a, b) =>
      new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime(),
  });

  return (
    <div>
      <PageHeader
        title="Asignaciones"
        subtitle="Asigna equipos y complementos a usuarios, y consulta el historial."
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
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl">
          Asignaciones activas
        </h2>
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
          namePlaceholder="Usuario o equipo..."
        />
        {activeList.total === 0 ? (
          <EmptyState text="No hay asignaciones activas." />
        ) : activeList.view === "list" ? (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-2)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 text-left">Usuario</th>
                  <th className="px-4 py-3 text-left">Equipo</th>
                  <th className="px-4 py-3 text-left">Desde</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  {role === "ADMIN" && (
                    <th className="px-4 py-3 text-left">Acción</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {activeList.pageItems.map((a) => (
                  <tr key={a.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">
                      <p className="font-medium">{a.employee.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {a.employee.position?.name || "Sin puesto"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{a.asset.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {a.asset.category} · {a.asset.serialNumber}
                      </p>
                    </td>
                    <td className="px-4 py-3">{formatDate(a.assignedAt)}</td>
                    <td className="px-4 py-3">
                      <Badge tone="success">Activa</Badge>
                    </td>
                    {role === "ADMIN" && (
                      <td className="px-4 py-3">
                        <Button
                          variant="secondary"
                          onClick={() => unassign(a.id)}
                        >
                          Liberar
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {activeList.pageItems.map((a) => (
              <Card key={a.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{a.employee.name}</p>
                    <p className="text-sm">{a.asset.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {a.asset.serialNumber} · {formatDate(a.assignedAt)}
                    </p>
                  </div>
                  <Badge tone="success">Activa</Badge>
                </div>
                {role === "ADMIN" && (
                  <Button
                    className="mt-3"
                    variant="secondary"
                    onClick={() => unassign(a.id)}
                  >
                    Liberar
                  </Button>
                )}
              </Card>
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
        <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl">
          Historial de asignaciones
        </h2>
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
          namePlaceholder="Usuario o equipo..."
        />
        {historyList.total === 0 ? (
          <EmptyState text="Sin historial." />
        ) : historyList.view === "grid" ? (
          <div className="space-y-3">
            {historyList.pageItems.map((a) => (
              <Card key={a.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {a.employee.name} → {a.asset.name}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {a.asset.serialNumber} · {formatDate(a.assignedAt)}
                      {a.unassignedAt
                        ? ` → ${formatDate(a.unassignedAt)}`
                        : " (vigente)"}
                    </p>
                  </div>
                  <Badge tone={a.unassignedAt ? "neutral" : "success"}>
                    {a.unassignedAt ? "Histórica" : "Activa"}
                  </Badge>
                </div>
                {a.notes && (
                  <p className="mt-2 text-xs text-[var(--muted)]">{a.notes}</p>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-2)] text-xs uppercase text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 text-left">Usuario</th>
                  <th className="px-4 py-3 text-left">Equipo</th>
                  <th className="px-4 py-3 text-left">Serial</th>
                  <th className="px-4 py-3 text-left">Periodo</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {historyList.pageItems.map((a) => (
                  <tr key={a.id} className="border-t border-[var(--border)]">
                    <td className="px-4 py-3">{a.employee.name}</td>
                    <td className="px-4 py-3">{a.asset.name}</td>
                    <td className="px-4 py-3">{a.asset.serialNumber}</td>
                    <td className="px-4 py-3">
                      {formatDate(a.assignedAt)}
                      {a.unassignedAt
                        ? ` → ${formatDate(a.unassignedAt)}`
                        : ""}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={a.unassignedAt ? "neutral" : "success"}>
                        {a.unassignedAt ? "Histórica" : "Activa"}
                      </Badge>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
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
