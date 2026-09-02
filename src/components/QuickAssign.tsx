"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, UserPlus, X, Check } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";

export type QuickEmployee = {
  id: string;
  name: string;
  email: string | null;
  department?: string | null;
  position?: { name: string } | null;
  active?: boolean;
};

export function useActiveEmployees() {
  const [employees, setEmployees] = useState<QuickEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/employees")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list = (data.employees || []).filter(
          (e: QuickEmployee) => e.active !== false
        );
        setEmployees(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { employees, loading };
}

export function EmployeePicker({
  employees,
  value,
  onChange,
  placeholder = "Buscar usuario activo...",
}: {
  employees: QuickEmployee[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const selected = employees.find((e) => e.id === value);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return employees.slice(0, 40);
    return employees
      .filter((e) => {
        const hay = `${e.name} ${e.email || ""} ${e.department || ""} ${e.position?.name || ""}`.toLowerCase();
        return hay.includes(term);
      })
      .slice(0, 40);
  }, [employees, q]);

  return (
    <div className="space-y-2">
      {selected ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--ink)]">
              {selected.name}
            </p>
            <p className="truncate text-xs text-[var(--muted)]">
              {selected.email || "Sin email"}
              {selected.position?.name ? ` · ${selected.position.name}` : ""}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            className="px-2 py-1"
            onClick={() => onChange("")}
            title="Cambiar usuario"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholder}
              className="pl-10"
              autoFocus
            />
          </div>
          <ul className="max-h-56 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-[var(--muted)]">
                No hay usuarios activos con ese filtro
              </li>
            ) : (
              filtered.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(e.id);
                      setQ("");
                    }}
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition hover:bg-[var(--surface-2)]"
                  >
                    <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[var(--ink)]">
                        {e.name}
                      </span>
                      <span className="block truncate text-xs text-[var(--muted)]">
                        {e.email || "Sin email"}
                        {e.position?.name ? ` · ${e.position.name}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </div>
  );
}

export function QuickAssignModal({
  open,
  asset,
  employees,
  onClose,
  onAssigned,
}: {
  open: boolean;
  asset: {
    id: string;
    name: string;
    serialNumber: string;
    category: string;
  } | null;
  employees: QuickEmployee[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmployeeId("");
    setNotes("");
    setError("");
  }, [open, asset?.id]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !asset) return null;

  async function assign() {
    if (!employeeId) {
      setError("Selecciona un usuario activo");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: asset!.id,
          employeeId,
          notes: notes.trim() || "Asignado desde Stock",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo asignar");
        return;
      }
      onAssigned();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)] animate-rise sm:rounded-2xl"
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Asignación rápida
            </p>
            <h2 className="mt-0.5 font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
              {asset.name}
            </h2>
            <p className="text-xs text-[var(--muted)]">
              {asset.serialNumber} · {asset.category}
            </p>
          </div>
          <Button type="button" variant="ghost" className="px-2" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <Label>Asignar a usuario activo</Label>
        <EmployeePicker
          employees={employees}
          value={employeeId}
          onChange={setEmployeeId}
        />

        <div className="mt-3">
          <Label>Nota (opcional)</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. Entrega en sitio..."
          />
        </div>

        {error && (
          <p className="mt-3 rounded-xl bg-[var(--badge-danger-bg)] px-3 py-2 text-sm text-[var(--badge-danger-fg)]">
            {error}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="button" onClick={assign} disabled={busy || !employeeId}>
            <Check className="h-4 w-4" />
            {busy ? "Asignando..." : "Asignar ahora"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export async function assignAssetToEmployee(opts: {
  assetId: string;
  employeeId: string;
  notes?: string;
}) {
  const res = await fetch("/api/assignments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assetId: opts.assetId,
      employeeId: opts.employeeId,
      notes: opts.notes || "Asignado desde Stock",
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "No se pudo asignar");
  }
  return data;
}

export function QuickAssignBar({
  employees,
  employeeId,
  onEmployeeChange,
  className,
}: {
  employees: QuickEmployee[];
  employeeId: string;
  onEmployeeChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.1rem] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]",
        className
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-[var(--accent)]" />
        <p className="text-sm font-semibold text-[var(--ink)]">
          Asignación rápida
        </p>
      </div>
      <p className="mb-3 text-xs text-[var(--muted)]">
        Elige un usuario activo y luego pulsa <strong>Asignar</strong> en cada
        equipo de stock.
      </p>
      <EmployeePicker
        employees={employees}
        value={employeeId}
        onChange={onEmployeeChange}
      />
    </div>
  );
}
