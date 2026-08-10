"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Textarea,
} from "@/components/ui";

type Position = {
  id: string;
  name: string;
  description: string | null;
  _count: { employees: number };
  employees: Array<{ id: string; name: string; email: string | null; active: boolean }>;
};

export default function PuestosPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [role, setRole] = useState<"ADMIN" | "USER">("USER");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/positions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo crear el puesto");
      return;
    }
    setName("");
    setDescription("");
    await load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este puesto?")) return;
    const res = await fetch(`/api/positions/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "No se pudo eliminar");
      return;
    }
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Puestos"
        subtitle="Crea puestos y asígnalos a usuarios del inventario."
      />

      {role === "ADMIN" && (
        <Card className="mb-6 animate-rise">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl">
            Nuevo puesto
          </h2>
          <form onSubmit={onCreate} className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Nombre</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            <div className="md:col-span-2">
              <Button type="submit">Crear puesto</Button>
            </div>
          </form>
        </Card>
      )}

      {positions.length === 0 ? (
        <EmptyState text="No hay puestos creados." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {positions.map((p) => (
            <Card key={p.id}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">{p.name}</h3>
                  <p className="text-sm text-[var(--muted)]">
                    {p.description || "Sin descripción"}
                  </p>
                </div>
                {role === "ADMIN" && (
                  <Button variant="danger" className="px-2 py-1" onClick={() => remove(p.id)}>
                    Eliminar
                  </Button>
                )}
              </div>
              <p className="mb-2 text-xs uppercase tracking-wide text-[var(--muted)]">
                {p._count.employees} usuario(s)
              </p>
              <ul className="space-y-1 text-sm">
                {p.employees.map((e) => (
                  <li key={e.id} className="rounded-lg bg-[var(--surface-2)] px-2 py-1">
                    {e.name}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
