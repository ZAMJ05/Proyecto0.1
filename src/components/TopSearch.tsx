"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, Download, FileText } from "lucide-react";
import { Button, Input, Badge } from "./ui";
import {
  buildExportPdf,
  csvFilename,
  type ExportPayload,
} from "@/lib/export-pdf";

type Result = {
  assets: Array<{
    id: string;
    name: string;
    serialNumber: string;
    status: string;
    assignments: Array<{ employee: { name: string } }>;
  }>;
  employees: Array<{
    id: string;
    name: string;
    email: string | null;
    assignments: Array<{ asset: { name: string; serialNumber: string } }>;
  }>;
};

export function TopSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      startTransition(async () => {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data);
        setOpen(true);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  async function exportCsv() {
    setExporting("csv");
    try {
      const res = await fetch("/api/export?format=csv");
      if (!res.ok) throw new Error("No se pudo exportar CSV");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = csvFilename();
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al exportar CSV");
    } finally {
      setExporting(null);
    }
  }

  async function exportPdf() {
    setExporting("pdf");
    try {
      const res = await fetch("/api/export?format=json");
      if (!res.ok) throw new Error("No se pudo generar el reporte");
      const data = (await res.json()) as ExportPayload;
      buildExportPdf(data);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al exportar PDF");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="relative flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results && setOpen(true)}
          placeholder="Buscar por número de serie o usuario..."
          className="pl-10"
        />
        {open && results && (
          <div className="absolute z-30 mt-2 max-h-96 w-full overflow-auto rounded-[1.1rem] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-lg)] animate-rise">
            {pending && (
              <p className="px-3 py-2 text-xs text-[var(--muted)]">Buscando...</p>
            )}
            <p className="mb-1 px-3 pt-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Equipos
            </p>
            {results.assets.length === 0 && (
              <p className="px-3 pb-2 text-sm text-[var(--muted)]">Sin equipos</p>
            )}
            {results.assets.map((a) => (
              <a
                key={a.id}
                href="/inventario"
                className="block rounded-xl px-3 py-2.5 transition hover:bg-[var(--surface-2)]"
                onClick={() => setOpen(false)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--ink)]">{a.name}</p>
                    <p className="text-xs tabular-nums text-[var(--muted)]">{a.serialNumber}</p>
                  </div>
                  <Badge>{a.status}</Badge>
                </div>
                {a.assignments[0] && (
                  <p className="mt-1 text-xs text-[var(--accent-strong)]">
                    {a.assignments[0].employee.name}
                  </p>
                )}
              </a>
            ))}
            <p className="mb-1 mt-2 px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Usuarios
            </p>
            {results.employees.length === 0 && (
              <p className="px-3 text-sm text-[var(--muted)]">Sin usuarios</p>
            )}
            {results.employees.map((e) => (
              <a
                key={e.id}
                href="/empleados"
                className="block rounded-xl px-3 py-2.5 transition hover:bg-[var(--surface-2)]"
                onClick={() => setOpen(false)}
              >
                <p className="text-sm font-medium text-[var(--ink)]">{e.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {e.email || "Sin email"} · {e.assignments.length} activo(s)
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={exportCsv}
          disabled={!!exporting}
          title="CSV actualizado con todas las tablas"
          className="whitespace-nowrap"
        >
          <Download className="h-4 w-4" />
          {exporting === "csv" ? "CSV..." : "CSV"}
        </Button>
        <Button
          variant="secondary"
          onClick={exportPdf}
          disabled={!!exporting}
          title="PDF profesional con portada, gráficas y tablas"
          className="whitespace-nowrap"
        >
          <FileText className="h-4 w-4" />
          {exporting === "pdf" ? "PDF..." : "PDF"}
        </Button>
      </div>
    </div>
  );
}
