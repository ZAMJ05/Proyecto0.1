"use client";

import { useMemo, useState } from "react";
import { Button, Input, Label, Select, Textarea } from "./ui";
import { ASSET_CATEGORIES, ASSET_STATUSES, addYears } from "@/lib/constants";
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
};

export function AssetForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Partial<AssetFormValues>;
  onSubmit: (values: AssetFormValues) => Promise<void> | void;
  onCancel: () => void;
  submitting?: boolean;
}) {
  const [values, setValues] = useState<AssetFormValues>({ ...empty, ...initial });
  const [error, setError] = useState("");

  const showAnydesk = values.category === "Laptop" && values.status === "Activo";
  const statusOptions = useMemo(() => {
    if (values.category === "Laptop") return ASSET_STATUSES;
    return ASSET_STATUSES.filter((s) => s !== "Reparacion");
  }, [values.category]);

  function update<K extends keyof AssetFormValues>(key: K, value: AssetFormValues[K]) {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "purchaseDate" && value) {
        next.renewalDate = toInputDate(addYears(new Date(String(value)), 4));
      }
      if (key === "category" && value !== "Laptop" && next.status === "Reparacion") {
        next.status = "Activo";
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await onSubmit(values);
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
          <Label>Número serial</Label>
          <Input
            required
            value={values.serialNumber}
            onChange={(e) => update("serialNumber", e.target.value)}
          />
        </div>
        <div>
          <Label>No. inventario</Label>
          <Input
            required
            value={values.inventoryNumber}
            onChange={(e) => update("inventoryNumber", e.target.value)}
          />
        </div>
        <div>
          <Label>Fecha de compra</Label>
          <Input
            type="date"
            required
            value={values.purchaseDate}
            onChange={(e) => update("purchaseDate", e.target.value)}
          />
        </div>
        <div>
          <Label>Fecha de renovación (4 años)</Label>
          <Input
            type="date"
            required
            value={values.renewalDate}
            onChange={(e) => update("renewalDate", e.target.value)}
          />
        </div>
        {showAnydesk && (
          <div className="sm:col-span-2">
            <Label>AnyDesk (laptops activas)</Label>
            <Input
              value={values.anydesk}
              onChange={(e) => update("anydesk", e.target.value)}
              placeholder="ID de AnyDesk"
            />
          </div>
        )}
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
          {submitting ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
