"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { useListControls } from "@/hooks/useListControls";
import { formatDate } from "@/lib/utils";

type AppUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  createdAt: string;
};

export default function UsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [meId, setMeId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [error, setError] = useState("");
  const [allowed, setAllowed] = useState(false);

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

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo crear");
      return;
    }
    setName("");
    setEmail("");
    setPassword("");
    setRole("USER");
    await load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este acceso?")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo eliminar");
      return;
    }
    await load();
  }

  const list = useListControls(users, {
    storageKey: "accesos-p25",
    defaultView: "list",
    getName: (u) => u.name,
    getSerial: (u) => u.email,
    sortFn: (a, b) => a.name.localeCompare(b.name, "es"),
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
        subtitle="Solo administradores pueden crear y borrar usuarios de login. El rol USER es de solo consulta."
      />

      <Card className="mb-6 animate-rise">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl">
          Crear usuario
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
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label>Contraseña</Label>
            <Input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <Label>Rol</Label>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value as "ADMIN" | "USER")}
            >
              <option value="USER">USER (solo consulta)</option>
              <option value="ADMIN">ADMIN (edición completa)</option>
            </Select>
          </div>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          <div className="md:col-span-2">
            <Button type="submit">Crear acceso</Button>
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
      />

      {list.total === 0 ? (
        <EmptyState text="No hay usuarios con esos filtros." />
      ) : list.view === "list" ? (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--surface-2)] text-xs uppercase text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Rol</th>
                <th className="px-4 py-3 text-left">Creado</th>
                <th className="px-4 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {list.pageItems.map((u) => (
                <tr key={u.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={u.role === "ADMIN" ? "info" : "neutral"}>
                      {u.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Button
                      variant="danger"
                      disabled={u.id === meId}
                      onClick={() => remove(u.id)}
                    >
                      Eliminar
                    </Button>
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
              <Button
                className="mt-3"
                variant="danger"
                disabled={u.id === meId}
                onClick={() => remove(u.id)}
              >
                Eliminar
              </Button>
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
