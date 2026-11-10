"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { AssetForm, type AssetFormValues } from "@/components/AssetForm";
import { Button } from "@/components/ui";
import { toInputDate } from "@/lib/utils";

type AssetLike = {
  id: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  serialNumber: string;
  inventoryNumber: string;
  status: string;
  purchaseDate: string;
  renewalDate?: string | null;
  anydesk?: string | null;
  notes?: string | null;
};

function toFormValues(asset: AssetLike): Partial<AssetFormValues> {
  return {
    name: asset.name,
    category: asset.category,
    brand: asset.brand,
    model: asset.model,
    serialNumber: asset.serialNumber,
    inventoryNumber: asset.inventoryNumber,
    status: asset.status,
    purchaseDate: toInputDate(asset.purchaseDate),
    renewalDate: toInputDate(asset.renewalDate),
    anydesk: asset.anydesk || "",
    notes: asset.notes || "",
  };
}

export function AssetEditModal({
  assetId,
  asset: initialAsset,
  onClose,
  onSaved,
}: {
  assetId?: string | null;
  asset?: AssetLike | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const id = assetId || initialAsset?.id || null;
  const [asset, setAsset] = useState<AssetLike | null>(initialAsset || null);
  const [loading, setLoading] = useState(!initialAsset && !!id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || initialAsset) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/assets/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo cargar");
        if (!cancelled) setAsset(data.asset);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Error al cargar");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, initialAsset]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!id) return null;

  async function save(values: AssetFormValues) {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo guardar");
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
      throw e;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Editar equipo"
        className="relative z-10 flex max-h-[min(92dvh,100%)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1rem] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] animate-rise sm:rounded-[var(--radius-lg)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Editar activo
            </p>
            <h2 className="mt-0.5 break-words font-[family-name:var(--font-display)] text-lg text-[var(--ink)] sm:text-xl">
              {asset?.name || "Equipo"}
            </h2>
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

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {loading ? (
            <p className="text-sm text-[var(--muted)]">Cargando equipo...</p>
          ) : error && !asset ? (
            <p className="rounded-xl bg-[var(--badge-danger-bg)] px-3 py-2 text-sm text-[var(--badge-danger-fg)]">
              {error}
            </p>
          ) : asset ? (
            <>
              {error && (
                <p className="mb-3 rounded-xl bg-[var(--badge-danger-bg)] px-3 py-2 text-sm text-[var(--badge-danger-fg)]">
                  {error}
                </p>
              )}
              <AssetForm
                key={asset.id}
                mode="edit"
                initial={toFormValues(asset)}
                submitting={submitting}
                onCancel={onClose}
                onSubmit={save}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
