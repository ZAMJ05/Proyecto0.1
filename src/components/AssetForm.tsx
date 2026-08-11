"use client";

import { useMemo, useState } from "react";
import { Button, Input, Label, Select, Textarea } from "./ui";
import {
  ASSET_CATEGORIES,
  ASSET_STATUSES,
  addYears,
  supportsQuantity,
} from "@/lib/constants";
import { toInputDate } from "@/lib/utils";

export type AssetFormValues = {
  name: string;
  category: string;
  brand: string;
  model: string;
  serialNumber: string;
  inventoryNumber: string;
  status: string;
  purchaseDate: string;
  renewalDate: string;
  anydesk: string;
  notes: string;
  quantity: number;
};

const empty: AssetFormValues = {
  name: "",
  category: "Laptop",
  brand: "",
  model: "",
  serialNumber: "",
  inventoryNumber: "",
  status: "Stock",
  purchaseDate: toInputDate(new Date()),
  renewalDate: toInputDate(addYears(new Date(), 4)),
  anydesk: "",
  notes: "",
  quantity: 1,
};

export function AssetForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
  mode = "create",
}: {
  initial?: Partial<AssetFormValues>;
  onSubmit: (values: AssetFormValues) => Promise<void> | void;
  onCancel: () => void;
  submitting?: boolean;
  mode?: "create" | "edit";
}) {
  const [values, setValues] = useState<AssetFormValues>({
    ...empty,
    ...initial,
    quantity: 1,
  });
  const [error, setError] = useState("");

  const isLaptop = values.category === "Laptop";
  const showAnydesk = isLaptop && values.status === "Activo";
  const showQuantity = mode === "create" && supportsQuantity(values.category);
  const statusOptions = useMemo(() => {
    if (values.category === "Laptop") return ASSET_STATUSES;
    return ASSET_STATUSES.filter((s) => s !== "Reparacion");
  }, [values.category]);

  function update<K extends keyof AssetFormValues>(
    key: K,
    value: AssetFormValues[K]
  ) {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "purchaseDate" && value && next.category === "Laptop") {
        next.renewalDate = toInputDate(addYears(new Date(String(value)), 4));
      }
      if (key === "category") {
        if (value !== "Laptop" && next.status === "Reparacion") {
          next.status = "Activo";
        }
        if (value === "Laptop") {
          next.renewalDate =
            next.renewalDate ||
            toInputDate(addYears(new Date(next.purchaseDate || Date.now()), 4));
        } else {
          next.renewalDate = "";
          next.anydesk = "";
        }
        if (!supportsQuantity(String(value))) {
          next.quantity = 1;
        }
      }
      if (key === "status" && !(next.category === "Laptop" && value === "Activo")) {
        next.anydesk = "";
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const qty = showQuantity
      ? Math.max(1, Math.min(100, Number(values.quantity) || 1))
      : 1;
    try {
      await onSubmit({
        ...values,
        quantity: qty,
        renewalDate: isLaptop ? values.renewalDate : "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Nombre del activo</Label>
          <Input
            required
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </div>
        <div>
          <Label>Categoría</Label>
          <Select
            value={values.category}
            onChange={(e) => update("category", e.target.value)}
          >
            {ASSET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === "AccesPoint" ? "Access Point" : c}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Estado</Label>
          <Select
            value={values.status}
            onChange={(e) => update("status", e.target.value)}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === "Reparacion" ? "Reparación" : s}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Marca</Label>
          <Input
            required
            value={values.brand}
            onChange={(e) => update("brand", e.target.value)}
          />
        </div>
        <div>
          <Label>Modelo</Label>
          <Input
            required
            value={values.model}
            onChange={(e) => update("model", e.target.value)}
          />
        </div>
        <div>
          <Label>
            {showQuantity && values.quantity > 1
              ? "Serial base"
              : "Número serial"}
          </Label>
          <Input
            required
            value={values.serialNumber}
            onChange={(e) => update("serialNumber", e.target.value)}
          />
        </div>
        <div>
          <Label>
            {showQuantity && values.quantity > 1
              ? "No. inventario base"
              : "No. inventario"}
          </Label>
          <Input
            required
            value={values.inventoryNumber}
            onChange={(e) => update("inventoryNumber", e.target.value)}
          />
        </div>
        {showQuantity && (
          <div className="sm:col-span-2">
            <Label>Cantidad de productos</Label>
            <Input
              type="number"
              min={1}
              max={100}
              required
              value={values.quantity}
              onChange={(e) =>
                update("quantity", Math.max(1, Number(e.target.value) || 1))
              }
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              {values.quantity > 1
                ? `Se crearán ${values.quantity} registros con sufijos -01, -02… en serial e inventario.`
                : "Usa más de 1 si registras varias unidades iguales (mouse, teclado, dock, etc.)."}
            </p>
          </div>
        )}
        <div>
          <Label>Fecha de compra</Label>
          <Input
            type="date"
            required
            value={values.purchaseDate}
            onChange={(e) => update("purchaseDate", e.target.value)}
          />
        </div>
        {isLaptop ? (
          <div>
            <Label>Fecha de renovación (4 años)</Label>
            <Input
              type="date"
              required
              value={values.renewalDate}
              onChange={(e) => update("renewalDate", e.target.value)}
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              Solo aplica a laptops.
            </p>
          </div>
        ) : (
          <div className="flex items-end">
            <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
              Renovación: no aplica para esta categoría (solo laptops).
            </p>
          </div>
        )}
        {isLaptop ? (
          showAnydesk ? (
            <div className="sm:col-span-2">
              <Label>AnyDesk</Label>
              <div className="flex gap-2">
                <Input
                  value={values.anydesk}
                  onChange={(e) => update("anydesk", e.target.value)}
                  placeholder="ID de AnyDesk"
                  className="font-mono"
                />
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Solo aplica a laptops en estado Activo. En el listado puedes
                copiarlo con un clic.
              </p>
            </div>
          ) : (
            <div className="sm:col-span-2">
              <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
                AnyDesk: disponible cuando la laptop esté en estado Activo.
              </p>
            </div>
          )
        ) : null}
        <div className="sm:col-span-2">
          <Label>Notas</Label>
          <Textarea
            rows={3}
            value={values.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </div>
      </div>
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting
            ? "Guardando..."
            : showQuantity && values.quantity > 1
              ? `Registrar ${values.quantity}`
              : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
