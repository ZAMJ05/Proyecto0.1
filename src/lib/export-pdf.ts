import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type ChartRow = { name: string; value: number };

export type ExportPayload = {
  exportedAt: string;
  exportedBy?: string;
  summary: {
    totalAssets: number;
    assetsTracked: number;
    stock: number;
    employees: number;
    employeesActive: number;
    activeAssignments: number;
    positions: number;
    pendingMaintenances: number;
    renewalsDue: number;
    laptops: {
      total: number;
      activas: number;
      inactivas: number;
      stock: number;
      reparacion: number;
    };
  };
  charts: {
    byCategory: ChartRow[];
    byStatus: ChartRow[];
    laptopsByStatus: ChartRow[];
  };
  tables: {
    assets: Array<{
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
      assignedTo: string;
      notes: string;
    }>;
    stock: Array<{
      name: string;
      category: string;
      brand: string;
      model: string;
      serialNumber: string;
      inventoryNumber: string;
      purchaseDate: string;
      notes: string;
    }>;
    employees: Array<{
      name: string;
      email: string;
      department: string;
      position: string;
      status: string;
      assignedCount: number;
      serials: string;
    }>;
    positions: Array<{
      name: string;
      hierarchy: string;
      reportsTo: string;
      designates: string;
      description: string;
      employees: number;
    }>;
    assignments: Array<{
      employee: string;
      position: string;
      asset: string;
      category: string;
      serialNumber: string;
      assignedAt: string;
      unassignedAt: string;
      status: string;
      notes: string;
    }>;
    maintenances: Array<{
      asset: string;
      category: string;
      serialNumber: string;
      scheduledDate: string;
      status: string;
      notes: string;
    }>;
    renewals: Array<{
      name: string;
      serialNumber: string;
      assignedTo: string;
      renewalDate: string;
      status: string;
    }>;
  };
};

const BRAND = {
  teal: [15, 118, 110] as [number, number, number],
  tealDark: [11, 95, 89] as [number, number, number],
  ink: [16, 36, 51] as [number, number, number],
  muted: [91, 114, 131] as [number, number, number],
  line: [213, 224, 232] as [number, number, number],
  soft: [241, 245, 249] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  success: [6, 95, 70] as [number, number, number],
  warn: [146, 64, 14] as [number, number, number],
  danger: [159, 18, 57] as [number, number, number],
  info: [7, 89, 133] as [number, number, number],
};

const CHART_COLORS = [
  "#0f766e",
  "#2563eb",
  "#d97706",
  "#be123c",
  "#0ea5e9",
  "#65a30d",
  "#7c3aed",
  "#9333ea",
];

function formatExportDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fileStamp(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function drawBarChart(title: string, rows: ChartRow[]) {
  const width = 1100;
  const height = 480;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // header band
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0, 0, width, 56);
  ctx.fillStyle = "#102433";
  ctx.font = "600 22px Helvetica, Arial, sans-serif";
  ctx.fillText(title, 28, 36);

  if (!rows.length) {
    ctx.fillStyle = "#5b7283";
    ctx.font = "16px Helvetica, Arial, sans-serif";
    ctx.fillText("Sin datos", 28, 120);
    return canvas.toDataURL("image/png");
  }

  const max = Math.max(...rows.map((r) => r.value), 1);
  const left = 70;
  const bottom = height - 80;
  const top = 80;
  const chartW = width - left - 40;
  const chartH = bottom - top;
  const slot = chartW / rows.length;
  const barW = Math.min(64, slot * 0.55);

  // grid
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = top + (chartH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + chartW, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(left + chartW, bottom);
  ctx.stroke();

  rows.forEach((row, i) => {
    const x = left + i * slot + (slot - barW) / 2;
    const h = (row.value / max) * (chartH - 8);
    const y = bottom - h;
    const color = CHART_COLORS[i % CHART_COLORS.length];

    // bar with rounded top (approx)
    ctx.fillStyle = color;
    ctx.fillRect(x, y, barW, h);

    ctx.fillStyle = "#102433";
    ctx.font = "bold 14px Helvetica, Arial, sans-serif";
    const val = String(row.value);
    ctx.fillText(val, x + barW / 2 - ctx.measureText(val).width / 2, y - 10);

    ctx.fillStyle = "#5b7283";
    ctx.font = "13px Helvetica, Arial, sans-serif";
    const label = row.name.length > 16 ? `${row.name.slice(0, 15)}…` : row.name;
    ctx.save();
    ctx.translate(x + barW / 2, bottom + 16);
    ctx.rotate(-Math.PI / 5);
    ctx.fillText(label, 0, 0);
    ctx.restore();
  });

  return canvas.toDataURL("image/png");
}

function drawDonutChart(title: string, rows: ChartRow[]) {
  const width = 820;
  const height = 480;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0, 0, width, 56);
  ctx.fillStyle = "#102433";
  ctx.font = "600 22px Helvetica, Arial, sans-serif";
  ctx.fillText(title, 28, 36);

  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  const cx = 230;
  const cy = 270;
  const radius = 120;
  const inner = 68;
  let angle = -Math.PI / 2;

  if (!rows.length) {
    ctx.fillStyle = "#5b7283";
    ctx.font = "16px Helvetica, Arial, sans-serif";
    ctx.fillText("Sin datos", 28, 120);
    return canvas.toDataURL("image/png");
  }

  rows.forEach((row, i) => {
    const slice = (row.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fill();
    angle += slice;
  });

  // donut hole
  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#102433";
  ctx.font = "bold 28px Helvetica, Arial, sans-serif";
  const totalText = String(total);
  ctx.fillText(totalText, cx - ctx.measureText(totalText).width / 2, cy + 4);
  ctx.fillStyle = "#5b7283";
  ctx.font = "13px Helvetica, Arial, sans-serif";
  ctx.fillText("total", cx - ctx.measureText("total").width / 2, cy + 22);

  rows.forEach((row, i) => {
    const ly = 100 + i * 36;
    const color = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fillStyle = color;
    ctx.fillRect(420, ly - 12, 14, 14);

    ctx.fillStyle = "#102433";
    ctx.font = "15px Helvetica, Arial, sans-serif";
    ctx.fillText(row.name, 446, ly);
    ctx.fillStyle = "#5b7283";
    const pct = Math.round((row.value / total) * 100);
    ctx.fillText(`${row.value}  (${pct}%)`, 446, ly + 16);
  });

  return canvas.toDataURL("image/png");
}

function drawPageChrome(
  doc: jsPDF,
  pageW: number,
  pageH: number,
  opts: { title?: string; subtitle?: string; exportedAt: string }
) {
  // top accent
  doc.setFillColor(...BRAND.teal);
  doc.rect(0, 0, pageW, 3.2, "F");

  if (opts.title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...BRAND.ink);
    doc.text(opts.title, 14, 14);
    if (opts.subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND.muted);
      doc.text(opts.subtitle, 14, 19.5);
    }
  }

  // footer
  const page = doc.getCurrentPageInfo().pageNumber;
  doc.setDrawColor(...BRAND.line);
  doc.setLineWidth(0.2);
  doc.line(14, pageH - 10, pageW - 14, pageH - 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text("AssetDesk · Inventario IT", 14, pageH - 5.5);
  doc.text(
    `Generado ${formatExportDate(opts.exportedAt)}`,
    pageW / 2,
    pageH - 5.5,
    { align: "center" }
  );
  doc.text(`Pág. ${page}`, pageW - 14, pageH - 5.5, { align: "right" });
}

function kpiBox(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string | number,
  accent: [number, number, number] = BRAND.teal
) {
  doc.setFillColor(...BRAND.soft);
  doc.setDrawColor(...BRAND.line);
  doc.roundedRect(x, y, w, h, 2.5, 2.5, "FD");
  doc.setFillColor(...accent);
  doc.rect(x, y, 1.8, h, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text(label, x + 6, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...BRAND.ink);
  doc.text(String(value), x + 6, y + 17);
}

function sectionTable(
  doc: jsPDF,
  title: string,
  subtitle: string,
  head: string[],
  body: (string | number)[][],
  exportedAt: string
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.addPage();
  drawPageChrome(doc, pageW, pageH, { title, subtitle, exportedAt });

  autoTable(doc, {
    startY: 26,
    head: [head],
    body: body.length
      ? body
      : [Array.from({ length: head.length }, (_, i) => (i === 0 ? "Sin registros" : ""))],
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: { top: 2.2, right: 2, bottom: 2.2, left: 2 },
      textColor: BRAND.ink,
      lineColor: BRAND.line,
      lineWidth: 0.1,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: BRAND.teal,
      textColor: BRAND.white,
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: { top: 2.6, right: 2, bottom: 2.6, left: 2 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 12, right: 12, top: 24, bottom: 14 },
    tableWidth: pageW - 24,
    didDrawPage: () => {
      drawPageChrome(doc, pageW, pageH, { title, subtitle, exportedAt });
    },
  });
}

export function buildExportPdf(data: ExportPayload) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const laptop = data.summary.laptops;
  const exportedAt = data.exportedAt;

  // ——— Cover ———
  doc.setFillColor(...BRAND.tealDark);
  doc.rect(0, 0, pageW, pageH, "F");

  // decorative band
  doc.setFillColor(...BRAND.teal);
  doc.rect(0, 0, 18, pageH, "F");

  doc.setFillColor(...BRAND.white);
  doc.roundedRect(36, 28, 52, 52, 8, 8, "F");
  doc.setFillColor(...BRAND.teal);
  doc.roundedRect(46, 38, 32, 32, 5, 5, "F");
  doc.setTextColor(...BRAND.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("AD", 54.5, 57);

  doc.setTextColor(...BRAND.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("AssetDesk", 36, 100);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text("Reporte ejecutivo de inventario IT", 36, 112);

  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.4);
  doc.line(36, 120, 120, 120);

  doc.setFontSize(10);
  doc.setTextColor(220, 240, 238);
  doc.text(`Generado: ${formatExportDate(exportedAt)}`, 36, 132);
  if (data.exportedBy) {
    doc.text(`Usuario: ${data.exportedBy}`, 36, 140);
  }
  doc.text("Confidencial — uso interno", 36, 148);

  // cover KPIs
  const coverKpis = [
    { label: "Equipos (sin baja)", value: data.summary.assetsTracked },
    { label: "Laptops activas", value: laptop.activas },
    { label: "En stock", value: data.summary.stock },
    { label: "Asignaciones", value: data.summary.activeAssignments },
  ];
  coverKpis.forEach((k, i) => {
    const x = 36 + i * 62;
    const y = 168;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, 56, 28, 3, 3, "F");
    doc.setTextColor(...BRAND.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(k.label, x + 5, y + 9);
    doc.setTextColor(...BRAND.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(String(k.value), x + 5, y + 21);
  });

  // ——— Summary ———
  doc.addPage();
  drawPageChrome(doc, pageW, pageH, {
    title: "Resumen ejecutivo",
    subtitle: "Indicadores clave del inventario",
    exportedAt,
  });

  const kpis: Array<{
    label: string;
    value: number;
    accent: [number, number, number];
  }> = [
    {
      label: "Equipos en seguimiento",
      value: data.summary.assetsTracked,
      accent: BRAND.teal,
    },
    {
      label: "Stock / reserva",
      value: data.summary.stock,
      accent: BRAND.info,
    },
    {
      label: "Usuarios activos",
      value: data.summary.employeesActive,
      accent: BRAND.success,
    },
    {
      label: "Asignaciones activas",
      value: data.summary.activeAssignments,
      accent: BRAND.tealDark,
    },
    {
      label: "Renovaciones (90 días)",
      value: data.summary.renewalsDue,
      accent: BRAND.warn,
    },
    {
      label: "Mantenimientos pend.",
      value: data.summary.pendingMaintenances,
      accent: BRAND.danger,
    },
  ];

  kpis.forEach((k, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    kpiBox(doc, 14 + col * 92, 28 + row * 30, 88, 26, k.label, k.value, k.accent);
  });

  const barImg = drawBarChart("Equipos por categoría", data.charts.byCategory || []);
  const pieImg = drawDonutChart(
    "Laptops por estado",
    data.charts.laptopsByStatus || []
  );
  if (barImg) doc.addImage(barImg, "PNG", 14, 92, 150, 66);
  if (pieImg) doc.addImage(pieImg, "PNG", 170, 92, 112, 66);

  // mini summary tables
  autoTable(doc, {
    startY: 164,
    head: [["Laptops", "Cant."]],
    body: [
      ["Total (sin baja)", laptop.total],
      ["Activas", laptop.activas],
      ["Inactivas", laptop.inactivas],
      ["Stock", laptop.stock],
      ["Reparación", laptop.reparacion],
    ],
    styles: { fontSize: 8, cellPadding: 2, textColor: BRAND.ink },
    headStyles: { fillColor: BRAND.teal, textColor: BRAND.white, fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14 },
    tableWidth: 70,
  });

  autoTable(doc, {
    startY: 164,
    head: [["Estado", "Cant."]],
    body: (data.charts.byStatus || []).map((r) => [r.name, r.value]),
    styles: { fontSize: 8, cellPadding: 2, textColor: BRAND.ink },
    headStyles: { fillColor: BRAND.tealDark, textColor: BRAND.white, fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 95 },
    tableWidth: 70,
  });

  autoTable(doc, {
    startY: 164,
    head: [["Categoría", "Cant."]],
    body: (data.charts.byCategory || []).slice(0, 8).map((r) => [r.name, r.value]),
    styles: { fontSize: 8, cellPadding: 2, textColor: BRAND.ink },
    headStyles: { fillColor: BRAND.info, textColor: BRAND.white, fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 176 },
    tableWidth: 100,
  });

  // ——— Detail sections ———
  sectionTable(
    doc,
    "Inventario completo",
    `${data.tables.assets.length} equipos registrados`,
    [
      "Nombre",
      "Categoría",
      "Marca",
      "Modelo",
      "Serial",
      "Estado",
      "Asignado",
      "Renovación",
      "AnyDesk",
    ],
    data.tables.assets.map((a) => [
      a.name,
      a.category,
      a.brand,
      a.model,
      a.serialNumber,
      a.status,
      a.assignedTo || "—",
      a.renewalDate,
      a.anydesk === "N/A" ? "—" : a.anydesk || "—",
    ]),
    exportedAt
  );

  sectionTable(
    doc,
    "Stock / Reserva",
    `${data.tables.stock.length} equipos disponibles`,
    ["Nombre", "Categoría", "Marca", "Modelo", "Serial", "N° inventario", "Compra", "Notas"],
    data.tables.stock.map((a) => [
      a.name,
      a.category,
      a.brand,
      a.model,
      a.serialNumber,
      a.inventoryNumber,
      a.purchaseDate,
      a.notes || "—",
    ]),
    exportedAt
  );

  sectionTable(
    doc,
    "Usuarios",
    `${data.tables.employees.length} registros · ${data.summary.employeesActive} activos`,
    ["Nombre", "Email", "Departamento", "Puesto", "Estado", "Equipos", "Seriales"],
    data.tables.employees.map((e) => [
      e.name,
      e.email || "—",
      e.department || "—",
      e.position || "—",
      e.status,
      e.assignedCount,
      e.serials || "—",
    ]),
    exportedAt
  );

  sectionTable(
    doc,
    "Organigrama de puestos",
    `${data.tables.positions.length} puestos`,
    ["Puesto", "Jerarquía", "Reporta a", "Designados", "Usuarios", "Descripción"],
    data.tables.positions.map((p) => [
      p.name,
      p.hierarchy || p.name,
      p.reportsTo || "—",
      p.designates || "—",
      p.employees,
      p.description || "—",
    ]),
    exportedAt
  );

  sectionTable(
    doc,
    "Asignaciones",
    `${data.tables.assignments.length} registros (activas e históricas)`,
    ["Usuario", "Puesto", "Equipo", "Categoría", "Serial", "Desde", "Liberado", "Estado"],
    data.tables.assignments.map((a) => [
      a.employee,
      a.position || "—",
      a.asset,
      a.category,
      a.serialNumber,
      a.assignedAt,
      a.unassignedAt || "—",
      a.status,
    ]),
    exportedAt
  );

  sectionTable(
    doc,
    "Renovaciones de laptops (90 días)",
    `${data.tables.renewals.length} próximas o vencidas`,
    ["Equipo", "Serial", "Asignado a", "Fecha renovación", "Estado"],
    data.tables.renewals.map((r) => [
      r.name,
      r.serialNumber,
      r.assignedTo || "—",
      r.renewalDate,
      r.status,
    ]),
    exportedAt
  );

  sectionTable(
    doc,
    "Mantenimientos pendientes",
    `${data.tables.maintenances.length} abiertos`,
    ["Equipo", "Categoría", "Serial", "Programado", "Estado", "Notas"],
    data.tables.maintenances.map((m) => [
      m.asset,
      m.category,
      m.serialNumber,
      m.scheduledDate,
      m.status,
      m.notes || "—",
    ]),
    exportedAt
  );

  // number pages in footer already draws current; re-draw last pages ok
  const totalPages = doc.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    doc.setPage(i);
    // refresh page number text area
    doc.setFillColor(...BRAND.white);
    doc.rect(pageW - 28, pageH - 9, 16, 6, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    doc.text(`Pág. ${i}/${totalPages}`, pageW - 14, pageH - 5.5, {
      align: "right",
    });
  }

  const filename = `assetdesk-reporte-${fileStamp(exportedAt)}.pdf`;
  doc.save(filename);
  return filename;
}

export function csvFilename(exportedAt = new Date().toISOString()) {
  return `assetdesk-inventario-${fileStamp(exportedAt)}.csv`;
}
