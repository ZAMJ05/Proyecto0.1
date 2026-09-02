"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";
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
import { formatDate } from "@/lib/utils";

type AppUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  createdAt: string;
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "USER" as "ADMIN" | "USER",
};

export default function UsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [meId, setMeId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [error, setError] = useState("");
  const [allowed, setAllowed] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    const meRes = await fetch("/api/auth/me");
    const me = await meRes.json();
    if (me.user?.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    setAllowed(true);
    setMeId(me.user.id);
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users || []);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(user: AppUser) {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
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
      const url = editing ? `/api/users/${editing.id}` : "/api/users";
      const method = editing ? "PUT" : "POST";
      const payload = editing
        ? {
            name: form.name,
            email: form.email,
            role: form.role,
            ...(form.password ? { password: form.password } : {}),
          }
        : {
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar");
        return;
      }
      cancelEdit();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este acceso?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo eliminar");
      return;
    }
    if (editing?.id === id) cancelEdit();
    await load();
  }

  const list = useListControls(users, {
    storageKey: "accesos-p25",
    defaultView: "list",
    getName: (u) => u.name,
    getSerial: (u) => u.email,
    defaultSortKey: "name",
    sortFields: {
      name: { label: "Nombre", getValue: (u) => u.name },
      email: { label: "Email", getValue: (u) => u.email },
      role: { label: "Rol", getValue: (u) => u.role },
      createdAt: {
        label: "Creado",
        getValue: (u) => new Date(u.createdAt).getTime(),
      },
    },
  });

  if (!allowed) {
    return (
      <p className="text-sm text-[var(--muted)]">Verificando permisos...</p>
    );
  }

  return (
    <div>
      <PageHeader
        title="Accesos a la aplicación"
        subtitle="Solo administradores pueden crear, editar y borrar usuarios de login. El rol USER es de solo consulta."
      />

      <Card className="mb-6 animate-rise">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            {editing ? `Editar acceso: ${editing.name}` : "Crear usuario"}
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
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <Label>
              {editing ? "Nueva contraseña (opcional)" : "Contraseña"}
            </Label>
            <Input
              required={!editing}
              type="password"
              minLength={editing ? undefined : 6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={editing ? "Dejar vacío para no cambiar" : undefined}
            />
          </div>
          <div>
            <Label>Rol</Label>
            <Select
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as "ADMIN" | "USER" })
              }
            >
              <option value="USER">USER (solo consulta)</option>
              <option value="ADMIN">ADMIN (edición completa)</option>
            </Select>
          </div>
          {error && (
            <p className="text-sm text-[var(--danger)] md:col-span-2">{error}</p>
          )}
          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button type="submit" disabled={saving}>
              {saving
                ? "Guardando..."
                : editing
                  ? "Guardar cambios"
                  : "Crear acceso"}
            </Button>
            {editing && (
              <Button type="button" variant="secondary" onClick={cancelEdit}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Card>

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
        serialLabel="Email"
        serialPlaceholder="Buscar por email..."
        sortOptions={list.sortOptions}
        sortKey={list.sortKey}
        sortDir={list.sortDir}
        onSortChange={list.setSort}
      />

      {list.total === 0 ? (
        <EmptyState text="No hay usuarios con esos filtros." />
      ) : list.view === "list" ? (
        <div className="table-shell">
          <table>
            <colgroup>
              <col className="col-md" />
              <col className="col-lg" />
              <col className="col-status" />
              <col className="col-date" />
              <col className="col-actions" />
            </colgroup>
            <thead>
              <tr>
                <SortableTh
                  label="Nombre"
                  columnKey="name"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                />
                <SortableTh
                  label="Email"
                  columnKey="email"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                />
                <SortableTh
                  label="Rol"
                  columnKey="role"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                />
                <SortableTh
                  label="Creado"
                  columnKey="createdAt"
                  activeKey={list.sortKey}
                  direction={list.sortDir}
                  onSort={list.toggleSort}
                />
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {list.pageItems.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <Badge tone={u.role === "ADMIN" ? "info" : "neutral"}>
                      {u.role}
                    </Badge>
                  </td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>
                    <div className="flex gap-1">
                      <Button
                        variant="secondary"
                        className="px-2 py-1"
                        title="Editar"
                        onClick={() => startEdit(u)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="danger"
                        className="px-2 py-1"
                        disabled={u.id === meId}
                        title="Eliminar"
                        onClick={() => remove(u.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.pageItems.map((u) => (
            <Card key={u.id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-sm text-[var(--muted)]">{u.email}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {formatDate(u.createdAt)}
                  </p>
                </div>
                <Badge tone={u.role === "ADMIN" ? "info" : "neutral"}>
                  {u.role}
                </Badge>
              </div>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => startEdit(u)}
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
                <Button
                  variant="danger"
                  disabled={u.id === meId}
                  onClick={() => remove(u.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
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
