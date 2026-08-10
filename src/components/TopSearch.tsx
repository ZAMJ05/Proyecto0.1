"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, Download, FileText } from "lucide-react";
import { Button, Input, Badge } from "./ui";
import { formatDate } from "@/lib/utils";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
    const res = await fetch("/api/export?format=csv");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventario.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    const res = await fetch("/api/export?format=json");
    const data = await res.json();
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("AssetDesk — Inventario IT", 14, 16);
    doc.setFontSize(9);
    doc.text(`Exportado: ${formatDate(data.exportedAt)}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [
        [
          "Nombre",
          "Categoría",
          "Marca",
          "Serial",
          "Estado",
          "Asignado",
          "Renovación",
        ],
      ],
      body: data.assets.map(
        (a: {
          name: string;
          category: string;
          brand: string;
          serialNumber: string;
          status: string;
          assignedTo: string;
          renewalDate: string;
        }) => [
          a.name,
          a.category,
          a.brand,
          a.serialNumber,
          a.status,
          a.assignedTo || "—",
          a.renewalDate,
        ]
      ),
      styles: { fontSize: 8 },
    });
    doc.save("inventario.pdf");
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
          <div className="absolute z-30 mt-2 max-h-96 w-full overflow-auto rounded-2xl border border-[var(--border)] bg-white p-3 shadow-xl">
            {pending && (
              <p className="px-2 py-1 text-xs text-[var(--muted)]">Buscando...</p>
            )}
            <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Equipos
            </p>
            {results.assets.length === 0 && (
              <p className="px-2 pb-2 text-sm text-[var(--muted)]">Sin equipos</p>
            )}
            {results.assets.map((a) => (
              <a
                key={a.id}
                href="/inventario"
                className="block rounded-xl px-2 py-2 hover:bg-[var(--surface-2)]"
                onClick={() => setOpen(false)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-[var(--muted)]">{a.serialNumber}</p>
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
            <p className="mb-2 mt-3 px-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
              Usuarios
            </p>
            {results.employees.length === 0 && (
              <p className="px-2 text-sm text-[var(--muted)]">Sin usuarios</p>
            )}
            {results.employees.map((e) => (
              <a
                key={e.id}
                href="/empleados"
                className="block rounded-xl px-2 py-2 hover:bg-[var(--surface-2)]"
                onClick={() => setOpen(false)}
              >
                <p className="text-sm font-medium">{e.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {e.email || "Sin email"} · {e.assignments.length} activo(s)
                </p>
              </a>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={exportCsv}>
          <Download className="h-4 w-4" />
          CSV
        </Button>
        <Button variant="secondary" onClick={exportPdf}>
          <FileText className="h-4 w-4" />
          PDF
        </Button>
      </div>
    </div>
  );
}
