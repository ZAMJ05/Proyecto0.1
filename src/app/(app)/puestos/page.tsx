"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Select,
  Textarea,
} from "@/components/ui";
import { ListFooter, ListToolbar } from "@/components/ListToolbar";
import { SortableTh } from "@/components/SortableTh";
import { useListControls } from "@/hooks/useListControls";

type PositionRef = { id: string; name: string };

type Position = {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  parent: PositionRef | null;
  children: PositionRef[];
  _count: { employees: number; children: number };
  employees: Array<{
    id: string;
    name: string;
    email: string | null;
    active: boolean;
  }>;
};

type TreeNode = Position & { kids: TreeNode[] };

function buildTree(positions: Position[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const p of positions) {
    byId.set(p.id, { ...p, kids: [] });
  }
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.kids.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name, "es"));
    nodes.forEach((n) => sortRec(n.kids));
  };
  sortRec(roots);
  return roots;
}

function chainLabel(p: Position, byId: Map<string, Position>): string {
  const parts: string[] = [p.name];
  let cur = p.parentId ? byId.get(p.parentId) : undefined;
  const guard = new Set<string>([p.id]);
  while (cur && !guard.has(cur.id)) {
    parts.unshift(cur.name);
    guard.add(cur.id);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return parts.join(" › ");
}

function OrgNode({
  node,
  depth = 0,
}: {
  node: TreeNode;
  depth?: number;
}) {
  return (
    <li className="relative">
      <div
        className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
        style={{ marginLeft: depth * 20 }}
      >
        <span className="font-semibold text-[var(--ink)]">{node.name}</span>
        {node.description && (
          <span className="text-xs text-[var(--muted)]">{node.description}</span>
        )}
        <span className="text-xs text-[var(--muted)]">
          {node._count.employees} usuario(s)
        </span>
        {node.kids.length > 0 && (
          <span className="text-xs text-[var(--muted)]">
            → {node.kids.map((k) => k.name).join(", ")}
          </span>
        )}
      </div>
      {node.kids.length > 0 && (
        <ul className="mt-2 space-y-2 border-l border-[var(--border)] pl-2">
          {node.kids.map((child) => (
            <OrgNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function PuestosPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("");
  const [editing, setEditing] = useState<Position | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const [pRes, meRes] = await Promise.all([
      fetch("/api/positions"),
      fetch("/api/auth/me"),
    ]);
    const [p, me] = await Promise.all([pRes.json(), meRes.json()]);
    setPositions(p.positions || []);
    setRole(me.user?.role || "USER");
  }

  useEffect(() => {
    load();
  }, []);

  const byId = useMemo(() => {
    const map = new Map<string, Position>();
    positions.forEach((p) => map.set(p.id, p));
    return map;
  }, [positions]);

  const tree = useMemo(() => buildTree(positions), [positions]);

  const parentOptions = useMemo(() => {
    if (!editing) return positions;
    // Exclude self and descendants to avoid cycles in the UI
    const blocked = new Set<string>([editing.id]);
    const queue = [...editing.children.map((c) => c.id)];
    while (queue.length) {
      const id = queue.shift()!;
      if (blocked.has(id)) continue;
      blocked.add(id);
      const node = byId.get(id);
      node?.children.forEach((c) => queue.push(c.id));
    }
    // Also walk full tree children from positions list
    const addDescendants = (id: string) => {
      for (const p of positions) {
        if (p.parentId === id && !blocked.has(p.id)) {
          blocked.add(p.id);
          addDescendants(p.id);
        }
      }
    };
    addDescendants(editing.id);
    return positions.filter((p) => !blocked.has(p.id));
  }, [positions, editing, byId]);

  function resetForm() {
    setEditing(null);
    setName("");
    setDescription("");
    setParentId("");
    setError("");
  }

  function startEdit(p: Position) {
    setEditing(p);
    setName(p.name);
    setDescription(p.description || "");
    setParentId(p.parentId || "");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const payload = {
      name,
      description: description || null,
      parentId: parentId || null,
    };
    const url = editing ? `/api/positions/${editing.id}` : "/api/positions";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo guardar el puesto");
      return;
    }
    resetForm();
    await load();
  }

  async function remove(id: string) {
    if (
      !confirm(
        "¿Eliminar este puesto? Los puestos que reportaban a este quedarán sin superior.",
      )
    )
      return;
    const res = await fetch(`/api/positions/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo eliminar");
      return;
    }
    if (editing?.id === id) resetForm();
    await load();
  }

  const list = useListControls(positions, {
    storageKey: "puestos-p25",
    defaultView: "list",
    getName: (p) =>
      `${p.name} ${p.description || ""} ${p.parent?.name || ""} ${p.children
        .map((c) => c.name)
        .join(" ")}`,
    getSerial: (p) => p.employees.map((e) => e.name).join(" "),
    defaultSortKey: "name",
    sortFields: {
      name: { label: "Puesto", getValue: (p) => p.name },
      reportsTo: {
        label: "Reporta a",
        getValue: (p) => p.parent?.name || "",
      },
      designados: {
        label: "Designados",
        getValue: (p) => p.children.map((c) => c.name).join(", "),
      },
      description: {
        label: "Descripción",
        getValue: (p) => p.description || "",
      },
      users: {
        label: "Usuarios",
        getValue: (p) => p.employees.length,
      },
    },
  });

  return (
    <div>
      <PageHeader
        title="Puestos"
        subtitle="Define la jerarquía (ej. Senior › Mid › Junior) y asígnala a usuarios del inventario."
      />

      {role === "ADMIN" && (
        <Card className="mb-6 animate-rise">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-[family-name:var(--font-display)] text-xl">
              {editing ? `Editar: ${editing.name}` : "Nuevo puesto"}
            </h2>
            {editing && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Nombre</Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Desarrollador Mid"
              />
            </div>
            <div>
              <Label>Reporta a (puesto superior)</Label>
              <Select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
              >
                <option value="">— Ninguno (nivel raíz) —</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Ejemplo: Junior reporta a Mid, Mid reporta a Senior → Senior ›
                Mid › Junior
              </p>
            </div>
            <div className="md:col-span-2">
              <Label>Descripción</Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-sm text-[var(--danger)] md:col-span-2">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button type="submit">
                {editing ? "Guardar cambios" : "Crear puesto"}
              </Button>
              {editing && (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </Card>
      )}

      {positions.length > 0 && (
        <Card className="mb-6 animate-rise">
          <h2 className="mb-1 font-[family-name:var(--font-display)] text-xl">
            Organigrama
          </h2>
          <p className="mb-4 text-sm text-[var(--muted)]">
            Jerarquía de puestos: superior → designados.
          </p>
          {tree.length === 0 ? (
            <EmptyState text="Sin jerarquía definida." />
          ) : (
            <ul className="space-y-3">
              {tree.map((node) => (
                <OrgNode key={node.id} node={node} />
              ))}
            </ul>
          )}
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
        serialLabel="Usuario en el puesto"
        serialPlaceholder="Filtrar por nombre de usuario..."
        sortOptions={list.sortOptions}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onSortChange={list.setSort}
      />

      {list.total === 0 ? (
        <EmptyState text="No hay puestos con esos filtros." />
      ) : list.view === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.pageItems.map((p) => (
            <Card key={p.id}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                  <p className="text-xs text-[var(--accent)]">
                    {chainLabel(p, byId)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {p.description || "Sin descripción"}
                  </p>
                </div>
                {role === "ADMIN" && (
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      variant="secondary"
                      className="px-2 py-1"
                      onClick={() => startEdit(p)}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      className="px-2 py-1"
                      onClick={() => remove(p.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                )}
              </div>
              <p className="mb-1 text-xs uppercase tracking-wide text-[var(--muted)]">
                Reporta a: {p.parent?.name || "—"}
              </p>
              <p className="mb-2 text-xs uppercase tracking-wide text-[var(--muted)]">
                Designados:{" "}
                {p.children.map((c) => c.name).join(", ") || "—"}
              </p>
              <p className="mb-2 text-xs uppercase tracking-wide text-[var(--muted)]">
                {p._count.employees} usuario(s)
              </p>
              <ul className="space-y-1 text-sm">
                {p.employees.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-lg bg-[var(--surface-2)] px-2 py-1"
                  >
                    {e.name}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      ) : (
        <div className="table-shell">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--surface-2)] text-xs uppercase text-[var(--muted)]">
              <tr>
                <SortableTh
                  label="Puesto"
                  columnKey="name"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                />
                <SortableTh
                  label="Reporta a"
                  columnKey="reportsTo"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                />
                <SortableTh
                  label="Designados"
                  columnKey="designados"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                />
                <SortableTh
                  label="Descripción"
                  columnKey="description"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                />
                <SortableTh
                  label="Usuarios"
                  columnKey="users"
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
              {list.pageItems.map((p) => (
                <tr key={p.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {chainLabel(p, byId)}
                    </div>
                  </td>
                  <td className="px-4 py-3">{p.parent?.name || "—"}</td>
                  <td className="px-4 py-3">
                    {p.children.map((c) => c.name).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {p.description || "Sin descripción"}
                  </td>
                  <td className="px-4 py-3">
                    {p.employees.map((e) => e.name).join(", ") || "—"}
                  </td>
                  {role === "ADMIN" && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          className="px-2 py-1"
                          onClick={() => startEdit(p)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="danger"
                          className="px-2 py-1"
                          onClick={() => remove(p.id)}
                        >
                          Eliminar
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
