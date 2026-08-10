"use client";

import { useEffect, useState } from "react";
import { Badge, Card, EmptyState, PageHeader, statusTone } from "@/components/ui";
import { formatDate } from "@/lib/utils";

type Asset = {
  id: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  serialNumber: string;
  inventoryNumber: string;
  status: string;
  purchaseDate: string;
  notes: string | null;
};

export default function StockPage() {
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    fetch("/api/assets?stockOnly=1")
      .then((r) => r.json())
      .then((d) => setAssets(d.assets || []));
  }, []);

  return (
    <div>
      <PageHeader
        title="Stock / Reserva"
        subtitle="Equipos nuevos o en reserva listos para asignación."
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card className="animate-rise">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Total en stock
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl">
            {assets.length}
          </p>
        </Card>
        <Card className="animate-rise stagger-1">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Laptops
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl">
            {assets.filter((a) => a.category === "Laptop").length}
          </p>
        </Card>
        <Card className="animate-rise stagger-2">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Complementos
          </p>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl">
            {
              assets.filter((a) =>
                ["Mouse", "Teclado", "Dock", "Adaptador", "Monitor"].includes(
                  a.category
                )
              ).length
            }
          </p>
        </Card>
      </div>

      {assets.length === 0 ? (
        <EmptyState text="No hay equipos en stock/reserva." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assets.map((asset, i) => (
            <Card key={asset.id} className={`animate-rise stagger-${(i % 5) + 1}`}>
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{asset.name}</h3>
                  <p className="text-sm text-[var(--muted)]">
                    {asset.brand} {asset.model}
                  </p>
                </div>
                <Badge tone={statusTone(asset.status)}>{asset.status}</Badge>
              </div>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--muted)]">Categoría</dt>
                  <dd>{asset.category}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--muted)]">Serial</dt>
                  <dd>{asset.serialNumber}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--muted)]">Inventario</dt>
                  <dd>{asset.inventoryNumber}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[var(--muted)]">Compra</dt>
                  <dd>{formatDate(asset.purchaseDate)}</dd>
                </div>
              </dl>
              {asset.notes && (
                <p className="mt-3 text-xs text-[var(--muted)]">{asset.notes}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
