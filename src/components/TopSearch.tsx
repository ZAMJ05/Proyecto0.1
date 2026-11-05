"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "./ui";
import {
  buildExportPdf,
  csvFilename,
  type ExportPayload,
} from "@/lib/export-pdf";

export function TopSearch() {
  const [exporting, setExporting] = useState<"csv" | "pdf" | "xlsx" | null>(null);

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

  async function exportPendingExcel() {
    setExporting("xlsx");
    try {
      const res = await fetch("/api/export/pendientes");
      if (!res.ok) throw new Error("No se pudo generar el Excel");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      a.href = url;
      a.download = `assetdesk-por-asignar-${stamp}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al exportar Excel");
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

  const btn =
    "h-8 border-white/15 bg-white/8 px-2 text-[var(--header-text)] hover:border-white/25 hover:bg-white/14 hover:text-white";

  return (
    <div className="flex gap-1.5">
      <Button
        variant="secondary"
        onClick={exportCsv}
        disabled={!!exporting}
        title="CSV actualizado con todas las tablas"
        className={btn}
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">
          {exporting === "csv" ? "CSV..." : "CSV"}
        </span>
      </Button>
      <Button
        variant="secondary"
        onClick={exportPendingExcel}
        disabled={!!exporting}
        title="Excel: laptops almacenadas, laptops por asignar, monitores y teléfonos"
        className={btn}
      >
        <FileSpreadsheet className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">
          {exporting === "xlsx" ? "Excel..." : "Excel"}
        </span>
      </Button>
      <Button
        variant="secondary"
        onClick={exportPdf}
        disabled={!!exporting}
        title="PDF profesional con portada, gráficas y tablas"
        className={btn}
      >
        <FileText className="h-3.5 w-3.5" />
        <span className="hidden lg:inline">
          {exporting === "pdf" ? "PDF..." : "PDF"}
        </span>
      </Button>
    </div>
  );
}
