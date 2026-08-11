"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, UserMinus, UserCheck, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Select,
} from "@/components/ui";
import { ListFooter, ListToolbar } from "@/components/ListToolbar";
import { SortableTh } from "@/components/SortableTh";
import { useListControls } from "@/hooks/useListControls";

type Position = { id: string; name: string };
type Employee = {
  id: string;
  name: string;
  email: string | null;
  department: string | null;
  active: boolean;
  position: Position | null;
  assignments: Array<{
    asset: {
      id: string;
      name: string;
      category: string;
      serialNumber: string;
      status: string;
    };
  }>;
};

const emptyForm = {
  name: "",
  email: "",
  department: "",
  positionId: "",
  active: true,
};

type StatusFilter = "all" | "active" | "left";

export default function EmpleadosPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  async function load() {
    const [eRes, pRes, meRes] = await Promise.all([
      fetch("/api/employees"),
      fetch("/api/positions"),
      fetch("/api/auth/me"),
    ]);
    const [e, p, me] = await Promise.all([
      eRes.json(),
      pRes.json(),
      meRes.json(),
    ]);
    setEmployees(e.employees || []);
    setPositions(p.positions || []);
    setRole(me.user?.role || "USER");
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(emp: Employee) {
    setEditing(emp);
    setForm({
      name: emp.name,
      email: emp.email || "",
      department: emp.department || "",
      positionId: emp.position?.id || "",
      active: emp.active,
    });
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const url = editing ? `/api/employees/${editing.id}` : "/api/employees";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          department: form.department,
          positionId: form.positionId || null,
          active: form.active,
          releaseAssets: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar");
        return;
      }
      if (data.releasedCount > 0) {
        alert(
          `Usuario actualizado. Se liberaron ${data.releasedCount} equipo(s) a Stock.`
        );
      }
      cancelEdit();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function markLeft(emp: Employee) {
    const assigned = emp.assignments.length;
    const ok = confirm(
      assigned > 0
        ? `¿Marcar a ${emp.name} como “ya no trabaja aquí”?\nSe liberarán ${assigned} equipo(s) y pasarán a Stock.`
        : `¿Marcar a ${emp.name} como “ya no trabaja aquí”?`
    );
    if (!ok) return;

    const res = await fetch(`/api/employees/${emp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: emp.name,
        email: emp.email,
        department: emp.department,
        positionId: emp.position?.id || null,
        active: false,
        releaseAssets: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo actualizar");
      return;
    }
    if (editing?.id === emp.id) cancelEdit();
    await load();
  }

  async function markActive(emp: Employee) {
    if (!confirm(`¿Reactivar a ${emp.name}? Volverá a aparecer para asignaciones.`)) {
      return;
    }
    const res = await fetch(`/api/employees/${emp.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: emp.name,
        email: emp.email,
        department: emp.department,
        positionId: emp.position?.id || null,
        active: true,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo reactivar");
      return;
    }
    await load();
  }

  async function removeEmployee(emp: Employee) {
    const assigned = emp.assignments.length;
    if (assigned > 0) {
      alert(
        `${emp.name} tiene ${assigned} activo(s) asignado(s). Márcalo como “ya no trabaja aquí” primero (libera equipos) o libéralos en Asignaciones.`
      );
      return;
    }
    if (!confirm(`¿Eliminar a ${emp.name}? Esta acción no se puede deshacer.`)) {
      return;
    }

    const res = await fetch(`/api/employees/${emp.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo eliminar");
      return;
    }
    if (editing?.id === emp.id) cancelEdit();
    await load();
  }

  const counts = useMemo(
    () => ({
      all: employees.length,
      active: employees.filter((e) => e.active).length,
      left: employees.filter((e) => !e.active).length,
    }),
    [employees]
  );

  const filteredEmployees = useMemo(() => {
    if (statusFilter === "active") return employees.filter((e) => e.active);
    if (statusFilter === "left") return employees.filter((e) => !e.active);
    return employees;
  }, [employees, statusFilter]);

  const list = useListControls(filteredEmployees, {
    storageKey: "empleados-p25",
    defaultView: "list",
    getName: (e) => `${e.name} ${e.email || ""}`,
    getSerial: (e) =>
      e.assignments.map((a) => a.asset.serialNumber).join(" "),
    defaultSortKey: "name",
    sortFields: {
      name: { label: "Usuario", getValue: (e) => e.name },
      position: {
        label: "Puesto",
        getValue: (e) => e.position?.name || "",
      },
      status: {
        label: "Estado",
        getValue: (e) => (e.active ? "Trabaja aquí" : "Ya no trabaja aquí"),
      },
      assets: {
        label: "Activos",
        getValue: (e) => e.assignments.length,
      },
      serials: {
        label: "Seriales",
        getValue: (e) =>
          e.assignments.map((a) => a.asset.serialNumber).join(", "),
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Usuarios y activos"
        subtitle="Usuarios del inventario. Puedes marcar quién ya no trabaja aquí; sus equipos se liberan a Stock."
      />

      {role === "ADMIN" && (
        <Card className="mb-6 animate-rise">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-xl">
              {editing
                ? `Editar usuario: ${editing.name}`
                : "Alta de usuario de inventario"}
            </h2>
            {editing && (
              <Button type="button" variant="ghost" onClick={cancelEdit}>
                <X className="h-4 w-4" />
                Cancelar
              </Button>
            )}
          </div>
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Nombre</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Departamento</Label>
              <Input
                value={form.department}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Puesto</Label>
              <Select
                value={form.positionId}
                onChange={(e) =>
                  setForm({ ...form, positionId: e.target.value })
                }
              >
                <option value="">Sin puesto</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            {editing && (
              <div className="md:col-span-2">
                <Label>Estado laboral</Label>
                <Select
                  value={form.active ? "1" : "0"}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.value === "1" })
                  }
                >
                  <option value="1">Trabaja aquí</option>
                  <option value="0">Ya no trabaja aquí</option>
                </Select>
                {!form.active && (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Al guardar, se liberarán sus equipos asignados y pasarán a
                    Stock.
                  </p>
                )}
              </div>
            )}
            {error && (
              <p className="text-sm text-[var(--danger)] md:col-span-2">
                {error}
              </p>
            )}
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving
                  ? "Guardando..."
                  : editing
                    ? "Guardar cambios"
                    : "Crear usuario"}
              </Button>
              {editing && (
                <Button type="button" variant="secondary" onClick={cancelEdit}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </Card>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ["active", `Trabajan aquí (${counts.active})`],
            ["left", `Ya no trabajan aquí (${counts.left})`],
            ["all", `Todos (${counts.all})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatusFilter(key)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === key
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:bg-[var(--surface-2)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

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
        namePlaceholder="Nombre o email..."
        serialPlaceholder="Serial de equipo asignado..."
        sortOptions={list.sortOptions}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onSortChange={list.setSort}
      />

      {list.total === 0 ? (
        <EmptyState text="No hay usuarios con esos filtros." />
      ) : list.view === "grid" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.pageItems.map((emp) => (
            <Card key={emp.id} className="animate-fade">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">{emp.name}</h3>
                  <p className="text-sm text-[var(--muted)]">
                    {emp.email || "Sin email"}
                    {emp.department ? ` · ${emp.department}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-[var(--accent-strong)]">
                    {emp.position?.name || "Sin puesto"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Badge tone={emp.active ? "success" : "danger"}>
                    {emp.active ? "Trabaja aquí" : "Ya no trabaja aquí"}
                  </Badge>
                  {role === "ADMIN" && (
                    <>
                      <Button
                        variant="secondary"
                        className="px-2 py-1"
                        title="Editar usuario"
                        onClick={() => startEdit(emp)}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                      {emp.active ? (
                        <Button
                          variant="secondary"
                          className="px-2 py-1"
                          title="Ya no trabaja aquí"
                          onClick={() => markLeft(emp)}
                        >
                          <UserMinus className="h-4 w-4" />
                          Baja
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          className="px-2 py-1"
                          title="Reactivar"
                          onClick={() => markActive(emp)}
                        >
                          <UserCheck className="h-4 w-4" />
                          Reactivar
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        className="px-2 py-1"
                        title="Eliminar usuario"
                        onClick={() => removeEmployee(emp)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Activos asignados ({emp.assignments.length})
              </p>
              {emp.assignments.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Sin activos</p>
              ) : (
                <ul className="space-y-2">
                  {emp.assignments.slice(0, 5).map((a) => (
                    <li
                      key={a.asset.id}
                      className="rounded-xl bg-[var(--surface-2)] px-3 py-2 text-sm"
                    >
                      <p className="font-medium">{a.asset.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {a.asset.category} · {a.asset.serialNumber} ·{" "}
                        {a.asset.status}
                      </p>
                    </li>
                  ))}
                  {emp.assignments.length > 5 && (
                    <li className="text-xs text-[var(--muted)]">
                      +{emp.assignments.length - 5} activo(s) más
                    </li>
                  )}
                </ul>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div className="table-shell">
          <table>
            <colgroup>
              <col className="col-lg" />
              <col className="col-md" />
              <col className="col-status" />
              <col className="col-num" />
              <col />
              {role === "ADMIN" && <col className="col-actions" />}
            </colgroup>
            <thead>
              <tr>
                <SortableTh
                  label="Usuario"
                  columnKey="name"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                />
                <SortableTh
                  label="Puesto"
                  columnKey="position"
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
                  label="Activos"
                  columnKey="assets"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                />
                <SortableTh
                  label="Seriales"
                  columnKey="serials"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                />
                {role === "ADMIN" && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {list.pageItems.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <p className="font-medium">{emp.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {emp.email || "Sin email"}
                    </p>
                  </td>
                  <td>{emp.position?.name || "Sin puesto"}</td>
                  <td>
                    <Badge tone={emp.active ? "success" : "danger"}>
                      {emp.active ? "Trabaja aquí" : "Ya no trabaja aquí"}
                    </Badge>
                  </td>
                  <td className="text-center">{emp.assignments.length}</td>
                  <td className="text-xs">
                    {emp.assignments
                      .map((a) => a.asset.serialNumber)
                      .join(", ") || "—"}
                  </td>
                  {role === "ADMIN" && (
                    <td>
                      <div className="flex gap-1">
                        <Button
                          variant="secondary"
                          className="px-2 py-1"
                          title="Editar"
                          onClick={() => startEdit(emp)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {emp.active ? (
                          <Button
                            variant="secondary"
                            className="px-2 py-1"
                            title="Ya no trabaja aquí"
                            onClick={() => markLeft(emp)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            className="px-2 py-1"
                            title="Reactivar"
                            onClick={() => markActive(emp)}
                          >
                            <UserCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="danger"
                          className="px-2 py-1"
                          title="Eliminar"
                          onClick={() => removeEmployee(emp)}
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
    </div>
  );
}
