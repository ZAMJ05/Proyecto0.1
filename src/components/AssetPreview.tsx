"use client";

import { useEffect, useState } from "react";
import { Eye, X, User, Wrench, Activity, Laptop } from "lucide-react";
import {
  Badge,
  Button,
  statusTone,
} from "@/components/ui";
import { CopyableValue } from "@/components/CopyableValue";
import { formatDate } from "@/lib/utils";
import { CATEGORY_LABELS } from "@/lib/constants";

export type AssetListItem = {
  id: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  serialNumber: string;
  inventoryNumber: string;
  status: string;
  purchaseDate: string;
  renewalDate: string | null;
  anydesk: string | null;
  notes: string | null;
  assignments: Array<{
    employee: {
      name: string;
      email: string | null;
      position?: { name: string } | null;
    };
  }>;
};

type AssetDetail = Omit<AssetListItem, "assignments"> & {
  assignments: Array<{
    id: string;
    assignedAt: string;
    unassignedAt: string | null;
    notes: string | null;
    employee: {
      name: string;
      email: string | null;
      position?: { name: string } | null;
    };
  }>;
  maintenances: Array<{
    id: string;
    scheduledDate: string;
    completedDate: string | null;
    status: string;
    notes: string | null;
  }>;
  activityLogs: Array<{
    id: string;
    action: string;
    details: string;
    createdAt: string;
  }>;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <div className="mt-1 text-sm text-[var(--ink)]">{children}</div>
    </div>
  );
}

export function AssetPreviewButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      className={className || "px-2 py-1"}
      onClick={onClick}
      title="Vista previa"
      aria-label="Vista previa"
    >
      <Eye className="h-4 w-4" />
    </Button>
  );
}

export function AssetPreview({
  assetId,
  onClose,
  onEdit,
}: {
  assetId: string | null;
  onClose: () => void;
  onEdit?: (asset: AssetListItem) => void;
}) {
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!assetId) {
      setAsset(null);
      setError("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/assets/${assetId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo cargar");
        if (!cancelled) setAsset(data.asset);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  useEffect(() => {
    if (!assetId) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [assetId, onClose]);

  if (!assetId) return null;

  const openAssignment = asset?.assignments.find((a) => !a.unassignedAt);
  const categoryLabel =
    CATEGORY_LABELS[asset?.category || ""] || asset?.category || "";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade"
        aria-label="Cerrar vista previa"
        onClick={onClose}
      />
      <aside
        className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] animate-rise"
        role="dialog"
        aria-modal="true"
        aria-label="Vista previa del equipo"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Vista previa
            </p>
            <h2 className="mt-0.5 truncate font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
              {loading ? "Cargando..." : asset?.name || "Equipo"}
            </h2>
            {asset && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone={statusTone(asset.status)}>{asset.status}</Badge>
                <span className="text-xs text-[var(--muted)]">
                  {categoryLabel}
                </span>
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="px-2"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="space-y-3 animate-pulse">
              <div className="h-16 rounded-xl bg-[var(--surface-2)]" />
              <div className="h-28 rounded-xl bg-[var(--surface-2)]" />
              <div className="h-28 rounded-xl bg-[var(--surface-2)]" />
            </div>
          )}
          {error && (
            <p className="rounded-xl bg-[var(--badge-danger-bg)] px-3 py-2 text-sm text-[var(--badge-danger-fg)]">
              {error}
            </p>
          )}
          {!loading && asset && (
            <div className="space-y-5">
              <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                  <Laptop className="h-4 w-4 text-[var(--accent)]" />
                  Identificación
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Marca / Modelo">
                    {asset.brand} {asset.model}
                  </Field>
                  <Field label="Categoría">{categoryLabel}</Field>
                  <Field label="Serial">
                    <CopyableValue value={asset.serialNumber} label="Copiar serial" />
                  </Field>
                  <Field label="N° inventario">
                    <CopyableValue
                      value={asset.inventoryNumber}
                      label="Copiar inventario"
                    />
                  </Field>
                  <Field label="Compra">{formatDate(asset.purchaseDate)}</Field>
                  <Field label="Renovación">
                    {asset.category === "Laptop"
                      ? formatDate(asset.renewalDate)
                      : "No aplica"}
                  </Field>
                  {asset.category === "Laptop" && (
                    <Field label="AnyDesk">
                      <CopyableValue
                        value={asset.anydesk}
                        label="Copiar AnyDesk"
                      />
                    </Field>
                  )}
                </div>
                {asset.notes && (
                  <div className="mt-3 border-t border-[var(--border)] pt-3">
                    <Field label="Notas">
                      <p className="whitespace-pre-wrap text-[var(--muted)]">
                        {asset.notes}
                      </p>
                    </Field>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-[var(--border)] p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                  <User className="h-4 w-4 text-[var(--accent)]" />
                  Asignación actual
                </div>
                {openAssignment ? (
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-[var(--ink)]">
                      {openAssignment.employee.name}
                    </p>
                    <p className="text-[var(--muted)]">
                      {openAssignment.employee.email || "Sin email"}
                      {openAssignment.employee.position?.name
                        ? ` · ${openAssignment.employee.position.name}`
                        : ""}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      Desde {formatDate(openAssignment.assignedAt)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted)]">Sin asignar</p>
                )}

                {asset.assignments.length > 0 && (
                  <div className="mt-4 border-t border-[var(--border)] pt-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      Historial
                    </p>
                    <ul className="space-y-2">
                      {asset.assignments.slice(0, 6).map((a) => (
                        <li
                          key={a.id}
                          className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs"
                        >
                          <span className="font-medium text-[var(--ink)]">
                            {a.employee.name}
                          </span>
                          <span className="text-[var(--muted)]">
                            {" "}
                            · {formatDate(a.assignedAt)}
                            {a.unassignedAt
                              ? ` → ${formatDate(a.unassignedAt)}`
                              : " · activa"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              {asset.maintenances.length > 0 && (
                <section className="rounded-xl border border-[var(--border)] p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                    <Wrench className="h-4 w-4 text-[var(--accent)]" />
                    Mantenimientos
                  </div>
                  <ul className="space-y-2">
                    {asset.maintenances.slice(0, 5).map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs"
                      >
                        <span>
                          {formatDate(m.scheduledDate)}
                          {m.notes ? ` · ${m.notes}` : ""}
                        </span>
                        <Badge
                          tone={
                            m.completedDate
                              ? "success"
                              : m.status === "Próximo"
                                ? "warn"
                                : "info"
                          }
                        >
                          {m.completedDate ? "Hecho" : m.status}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {asset.activityLogs.length > 0 && (
                <section className="rounded-xl border border-[var(--border)] p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
                    <Activity className="h-4 w-4 text-[var(--accent)]" />
                    Actividad reciente
                  </div>
                  <ul className="space-y-2">
                    {asset.activityLogs.map((log) => (
                      <li key={log.id} className="text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="info">{log.action}</Badge>
                          <span className="text-[var(--muted)]">
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-[var(--ink)]">{log.details}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>

        {asset && (
          <div className="flex flex-wrap gap-2 border-t border-[var(--border)] px-5 py-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
            {onEdit && (
              <Button
                type="button"
                onClick={() => {
                  onEdit(asset);
                  onClose();
                }}
              >
                Editar equipo
              </Button>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
