"use client";

import { FormEvent, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
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
import { ListToolbar } from "@/components/ListToolbar";
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

export default function EmpleadosPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [department, setDepartment] = useState("");
  const [positionId, setPositionId] = useState("");
  const [error, setError] = useState("");

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

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        department,
        positionId: positionId || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo crear");
      return;
    }
    setName("");
    setEmail("");
    setDepartment("");
    setPositionId("");
    await load();
  }

  async function removeEmployee(emp: Employee) {
    const assigned = emp.assignments.length;
    const message =
      assigned > 0
        ? `${emp.name} tiene ${assigned} activo(s) asignado(s). Debes liberarlos en Asignaciones antes de eliminarlo.`
        : `¿Eliminar a ${emp.name}? Esta acción no se puede deshacer.`;

    if (assigned > 0) {
      alert(message);
      return;
    }
    if (!confirm(message)) return;

    const res = await fetch(`/api/employees/${emp.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo eliminar");
      return;
    }
    await load();
  }

  const list = useListControls(employees, {
    storageKey: "empleados",
    defaultView: "grid",
    getName: (e) => `${e.name} ${e.email || ""}`,
    getSerial: (e) =>
      e.assignments.map((a) => a.asset.serialNumber).join(" "),
  });

  return (
    <div>
      <PageHeader
        title="Usuarios y activos"
        subtitle="Lista de usuarios (empleados) con los activos que tienen asignados."
      />

      {role === "ADMIN" && (
        <Card className="mb-6 animate-rise">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl">
            Alta de usuario de inventario
          </h2>
          <form onSubmit={onCreate} className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Nombre</Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Departamento</Label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
            <div>
              <Label>Puesto</Label>
              <Select
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
              >
                <option value="">Sin puesto</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            <div className="md:col-span-2">
              <Button type="submit">Crear usuario</Button>
            </div>
          </form>
        </Card>
      )}

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
                <div className="flex items-center gap-2">
                  <Badge tone={emp.active ? "success" : "danger"}>
                    {emp.active ? "Activo" : "Inactivo"}
                  </Badge>
                  {role === "ADMIN" && (
                    <Button
                      variant="danger"
                      className="px-2 py-1"
                      title="Eliminar usuario"
                      onClick={() => removeEmployee(emp)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </Button>
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
                  {emp.assignments.map((a) => (
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
                </ul>
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
                <th className="px-4 py-3 text-left">Puesto</th>
                <th className="px-4 py-3 text-left">Activos</th>
                <th className="px-4 py-3 text-left">Seriales</th>
                {role === "ADMIN" && (
                  <th className="px-4 py-3 text-left">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody>
              {list.pageItems.map((emp) => (
                <tr key={emp.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">
                    <p className="font-medium">{emp.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {emp.email || "Sin email"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {emp.position?.name || "Sin puesto"}
                  </td>
                  <td className="px-4 py-3">{emp.assignments.length}</td>
                  <td className="px-4 py-3 text-xs">
                    {emp.assignments
                      .map((a) => a.asset.serialNumber)
                      .join(", ") || "—"}
                  </td>
                  {role === "ADMIN" && (
                    <td className="px-4 py-3">
                      <Button
                        variant="danger"
                        className="px-2 py-1"
                        onClick={() => removeEmployee(emp)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
