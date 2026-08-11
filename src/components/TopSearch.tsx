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

type ChartRow = { name: string; value: number };

function drawBarChart(title: string, rows: ChartRow[]) {
  const width = 900;
  const height = 420;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#102433";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(title, 24, 36);

  const max = Math.max(...rows.map((r) => r.value), 1);
  const left = 70;
  const bottom = height - 70;
  const top = 70;
  const chartW = width - left - 30;
  const chartH = bottom - top;
  const barW = Math.min(56, chartW / Math.max(rows.length, 1) - 12);

  ctx.strokeStyle = "#d5e0e8";
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(left + chartW, bottom);
  ctx.stroke();

  rows.forEach((row, i) => {
    const x =
      left +
      (i + 0.5) * (chartW / Math.max(rows.length, 1)) -
      barW / 2;
    const h = (row.value / max) * (chartH - 10);
    const y = bottom - h;
    ctx.fillStyle = i % 2 === 0 ? "#0f766e" : "#2563eb";
    ctx.fillRect(x, y, barW, h);
    ctx.fillStyle = "#102433";
    ctx.font = "12px sans-serif";
    ctx.fillText(String(row.value), x + barW / 2 - 6, y - 8);
    ctx.save();
    ctx.translate(x + barW / 2, bottom + 14);
    ctx.rotate(-Math.PI / 4);
    ctx.fillText(row.name.slice(0, 14), 0, 0);
    ctx.restore();
  });

  return canvas.toDataURL("image/png");
}

function drawPieChart(title: string, rows: ChartRow[]) {
  const width = 700;
  const height = 420;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const colors = [
    "#0f766e",
    "#2563eb",
    "#d97706",
    "#be123c",
    "#7c3aed",
    "#0ea5e9",
    "#65a30d",
    "#9333ea",
  ];
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  const cx = 220;
  const cy = 230;
  const radius = 120;
  let angle = -Math.PI / 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#102433";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText(title, 24, 36);

  rows.forEach((row, i) => {
    const slice = (row.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    angle += slice;

    const ly = 90 + i * 28;
    ctx.fillRect(400, ly - 12, 16, 16);
    ctx.fillStyle = "#102433";
    ctx.font = "14px sans-serif";
    ctx.fillText(`${row.name}: ${row.value}`, 424, ly);
    ctx.fillStyle = colors[i % colors.length];
  });

  return canvas.toDataURL("image/png");
}

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
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "assetdesk-inventario-completo.csv";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }

  async function exportPdf() {
    setExporting("pdf");
    try {
      const res = await fetch("/api/export?format=json");
      const data = await res.json();
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();

      doc.setFontSize(18);
      doc.text("AssetDesk — Reporte de inventario IT", 14, 18);
      doc.setFontSize(10);
      doc.text(`Exportado: ${formatDate(data.exportedAt)}`, 14, 26);
      doc.text(
        `Totales: ${data.summary.totalAssets} equipos · ${data.summary.stock} stock · ${data.summary.employees} usuarios · ${data.summary.activeAssignments} asignaciones activas`,
        14,
        32
      );

      const barImg = drawBarChart(
        "Equipos por categoría",
        data.charts.byCategory || []
      );
      const pieImg = drawPieChart(
        "Distribución por estado",
        data.charts.byStatus || []
      );

      if (barImg) doc.addImage(barImg, "PNG", 14, 40, 140, 70);
      if (pieImg) doc.addImage(pieImg, "PNG", 160, 40, 120, 70);

      doc.setFontSize(12);
      doc.text("Resumen por categoría", 14, 120);
      autoTable(doc, {
        startY: 124,
        head: [["Categoría", "Cantidad"]],
        body: (data.charts.byCategory || []).map((r: ChartRow) => [
          r.name,
          r.value,
        ]),
        styles: { fontSize: 8 },
        margin: { left: 14 },
        tableWidth: 80,
      });

      doc.text("Resumen por estado", 110, 120);
      autoTable(doc, {
        startY: 124,
        head: [["Estado", "Cantidad"]],
        body: (data.charts.byStatus || []).map((r: ChartRow) => [
          r.name,
          r.value,
        ]),
        styles: { fontSize: 8 },
        margin: { left: 110 },
        tableWidth: 70,
      });

      const sections: Array<{
        title: string;
        head: string[];
        body: (string | number)[][];
      }> = [
        {
          title: "Inventario completo",
          head: [
            "Nombre",
            "Categoría",
            "Marca",
            "Serial",
            "Estado",
            "Asignado",
            "Renovación",
          ],
          body: (data.tables.assets || []).map(
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
        },
        {
          title: "Stock / Reserva",
          head: ["Nombre", "Categoría", "Serial", "Inventario", "Compra"],
          body: (data.tables.stock || []).map(
            (a: {
              name: string;
              category: string;
              serialNumber: string;
              inventoryNumber: string;
              purchaseDate: string;
            }) => [
              a.name,
              a.category,
              a.serialNumber,
              a.inventoryNumber,
              a.purchaseDate,
            ]
          ),
        },
        {
          title: "Usuarios y activos",
          head: ["Nombre", "Email", "Puesto", "Activos", "Seriales"],
          body: (data.tables.employees || []).map(
            (e: {
              name: string;
              email: string;
              position: string;
              assignedCount: number;
              serials: string;
            }) => [
              e.name,
              e.email || "—",
              e.position || "—",
              e.assignedCount,
              e.serials || "—",
            ]
          ),
        },
        {
          title: "Asignaciones",
          head: ["Usuario", "Equipo", "Serial", "Desde", "Estado"],
          body: (data.tables.assignments || []).map(
            (a: {
              employee: string;
              asset: string;
              serialNumber: string;
              assignedAt: string;
              status: string;
            }) => [
              a.employee,
              a.asset,
              a.serialNumber,
              a.assignedAt,
              a.status,
            ]
          ),
        },
      ];

      for (const section of sections) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text(section.title, 14, 18);
        autoTable(doc, {
          startY: 24,
          head: [section.head],
          body: section.body,
          styles: { fontSize: 7 },
          headStyles: { fillColor: [15, 118, 110] },
          margin: { left: 10, right: 10 },
          tableWidth: pageW - 20,
        });
      }

      doc.save("assetdesk-reporte.pdf");
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
          <div className="absolute z-30 mt-2 max-h-96 w-full overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl">
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
        <Button
          variant="secondary"
          onClick={exportCsv}
          disabled={!!exporting}
          title="CSV con todas las tablas"
        >
          <Download className="h-4 w-4" />
          {exporting === "csv" ? "CSV..." : "CSV tablas"}
        </Button>
        <Button
          variant="secondary"
          onClick={exportPdf}
          disabled={!!exporting}
          title="PDF con gráficas y tablas"
        >
          <FileText className="h-4 w-4" />
          {exporting === "pdf" ? "PDF..." : "PDF + gráficas"}
        </Button>
      </div>
    </div>
  );
}
