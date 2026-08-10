"use client";

import { useEffect, useState } from "react";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  statusTone,
} from "@/components/ui";
import { ListToolbar } from "@/components/ListToolbar";
import { useListControls } from "@/hooks/useListControls";
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

  const list = useListControls(assets, {
    storageKey: "stock",
    defaultView: "grid",
    getName: (a) => a.name,
    getSerial: (a) => `${a.serialNumber} ${a.inventoryNumber}`,
  });

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
      />

      {list.total === 0 ? (
        <EmptyState text="No hay equipos en stock/reserva con esos filtros." />
      ) : list.view === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.pageItems.map((asset) => (
            <Card key={asset.id}>
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
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--surface-2)] text-xs uppercase text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 text-left">Nombre</th>
                <th className="px-4 py-3 text-left">Categoría</th>
                <th className="px-4 py-3 text-left">Serial</th>
                <th className="px-4 py-3 text-left">Inventario</th>
                <th className="px-4 py-3 text-left">Compra</th>
              </tr>
            </thead>
            <tbody>
              {list.pageItems.map((asset) => (
                <tr key={asset.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">
                    <p className="font-medium">{asset.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {asset.brand} {asset.model}
                    </p>
                  </td>
                  <td className="px-4 py-3">{asset.category}</td>
                  <td className="px-4 py-3">{asset.serialNumber}</td>
                  <td className="px-4 py-3">{asset.inventoryNumber}</td>
                  <td className="px-4 py-3">{formatDate(asset.purchaseDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
