import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import { prisma } from "./prisma";

type Person = { name: string; position: string };
type AssignRow = {
  assignedAt: Date;
  unassignedAt: Date | null;
  employee: { name: string; position: { name: string } | null };
};
type LogRow = { details: string; createdAt: Date };
type AssetRow = {
  name: string;
  category: string;
  brand: string;
  model: string;
  serialNumber: string;
  inventoryNumber: string;
  status: string;
  anydesk: string | null;
  notes: string | null;
  assignments: AssignRow[];
  activityLogs: LogRow[];
};

export type LaptopLine = {
  serial: string;
  inventory: string;
  brand: string;
  model: string;
  cpu: string;
  specs: string;
  ram: string;
  disk: string;
  screen: string;
  os: string;
  status: string;
  origin: string;
  kind: string;
  lastUser: string;
  finalUser: string;
  position: string;
  releasedAt: string;
  ad: string;
  anydesk: string;
  notes: string;
};

export type PeripheralLine = {
  type: string;
  serial: string;
  inventory: string;
  brand: string;
  model: string;
  name: string;
  specs: string;
  status: string;
  situation: string;
  lastUser: string;
  finalUser: string;
  releasedAt: string;
  ad: string;
  notes: string;
};

const HEADER_FILL = "1F4E79";
const HEADER_FONT = "FFFFFF";
const ALT_FILL = "E8F0F8";

function grab(notes: string, label: string) {
  const match = notes.match(
    new RegExp(`(?:^|\\|)\\s*${label}\\s*:\\s*([^|]+)`, "i")
  );
  return match ? match[1].trim() : "";
}

export function parseCharacteristics(notes?: string | null) {
  const text = notes || "";
  const specs = grab(text, "Specs") || grab(text, "Características");
  const parts = specs
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const ram =
    parts.find((part) => /\d+\s*GB/i.test(part) && !/SSD|HDD|NVMe/i.test(part)) ||
    "";
  const disk = parts.find((part) => /SSD|HDD|NVMe|\d+\s*TB/i.test(part)) || "";
  const screen =
    parts.find((part) => /"|pulg|HD|FHD|IPS|WUXGA/i.test(part)) || "";
  const osFromSpecs = parts.find((part) => /windows|linux|macos/i.test(part)) || "";
  return {
    cpu: grab(text, "CPU"),
    specs,
    ram: ram.replace(/\s+/g, ""),
    disk,
    screen,
    os: grab(text, "SO") || grab(text, "OS") || osFromSpecs,
    position: grab(text, "Puesto"),
    ad: grab(text, "AD"),
    anydeskNote: grab(text, "AnyDesk"),
  };
}

function formatWhen(date: Date | null | undefined) {
  if (!date) return "";
  return date.toLocaleDateString("es-MX", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function lastUserFromLogs(logs: LogRow[]) {
  const sorted = [...logs].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  );
  for (const log of sorted) {
    const match = log.details.match(
      /Asignado a:\s*([^;|→]*?)\s*→\s*([^;|]*)/
    );
    if (!match) continue;
    const from = match[1].trim();
    const to = match[2].trim();
    if (to) return to;
    if (from) return from;
  }
  return "";
}

function peopleOf(asset: AssetRow, mongoUser: string) {
  const history = [...asset.assignments].sort(
    (a, b) => +new Date(b.assignedAt) - +new Date(a.assignedAt)
  );
  const open = history.find((row) => !row.unassignedAt);
  const previous = history.find((row) => row.unassignedAt);
  const latest = history[0];
  const fromLog = lastUserFromLogs(asset.activityLogs);
  const last: Person = open
    ? {
        name: previous?.employee.name || fromLog || mongoUser,
        position: previous?.employee.position?.name || "",
      }
    : {
        name: latest?.employee.name || fromLog || mongoUser,
        position: latest?.employee.position?.name || "",
      };
  const released = open ? previous?.unassignedAt : latest?.unassignedAt;
  return {
    finalUser: open?.employee.name || "",
    lastUser: last.name,
    position: last.position,
    releasedAt: released || null,
  };
}

function isPhone(asset: { name: string; model: string; serialNumber: string }) {
  const blob = `${asset.name} ${asset.model} ${asset.serialNumber}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return blob.includes("telefono") || blob.includes("kit-tel");
}

function hasOpenAssignment(asset: AssetRow) {
  return asset.assignments.some((row) => !row.unassignedAt);
}

function loadMongoLastUsers() {
  const file = path.join(process.cwd(), "data", "mongo-export", "assets.json");
  const map = new Map<string, string>();
  if (!fs.existsSync(file)) return map;
  try {
    const rows = JSON.parse(fs.readFileSync(file, "utf8")) as Array<{
      serial?: string;
      assignedTo?: string;
    }>;
    for (const row of rows) {
      const serial = (row.serial || "").trim().toUpperCase();
      const user = (row.assignedTo || "").trim();
      if (serial && user) map.set(serial, user);
    }
  } catch {
    return map;
  }
  return map;
}

function toLaptop(asset: AssetRow, mongoUser: string, origin: string): LaptopLine {
  const specs = parseCharacteristics(asset.notes);
  const people = peopleOf(asset, mongoUser);
  const lastUser = people.lastUser;
  return {
    serial: asset.serialNumber,
    inventory: asset.inventoryNumber,
    brand: asset.brand,
    model: asset.model,
    cpu: specs.cpu,
    specs: specs.specs,
    ram: specs.ram,
    disk: specs.disk,
    screen: specs.screen,
    os: specs.os,
    status: asset.status,
    origin,
    kind: lastUser ? "Usada" : "Nueva",
    lastUser,
    finalUser: people.finalUser,
    position: people.position || specs.position,
    releasedAt: formatWhen(people.releasedAt),
    ad: specs.ad,
    anydesk: asset.anydesk || (specs.anydeskNote === "CAMBIO" ? "" : specs.anydeskNote),
    notes: asset.name,
  };
}

export async function loadPendingReport() {
  const mongoUsers = loadMongoLastUsers();
  const assets = await prisma.asset.findMany({
    where: {
      status: { in: ["Stock", "Activo"] },
      OR: [
        { category: "Laptop" },
        { category: "Monitor" },
        { name: { contains: "Tel" } },
        { serialNumber: { startsWith: "KIT-TEL" } },
      ],
    },
    include: {
      assignments: {
        orderBy: { assignedAt: "desc" },
        include: { employee: { include: { position: true } } },
      },
      activityLogs: {
        where: { details: { contains: "Asignado a" } },
        orderBy: { createdAt: "desc" },
        take: 8,
      },
    },
    orderBy: [{ brand: "asc" }, { model: "asc" }, { serialNumber: "asc" }],
  });

  const stored: LaptopLine[] = [];
  const pending: LaptopLine[] = [];
  const peripherals: PeripheralLine[] = [];

  for (const asset of assets) {
    const mongoUser = mongoUsers.get(asset.serialNumber.toUpperCase()) || "";
    if (asset.category === "Laptop") {
      if (asset.status === "Stock") {
        const line = toLaptop(asset, mongoUser, "Almacén");
        stored.push(line);
        pending.push(line);
      } else if (asset.status === "Activo" && !hasOpenAssignment(asset)) {
        pending.push(toLaptop(asset, mongoUser, "Liberada para reasignar"));
      }
      continue;
    }

    const phone = isPhone(asset);
    const monitor = asset.category === "Monitor";
    if ((!phone && !monitor) || hasOpenAssignment(asset)) continue;
    const specs = parseCharacteristics(asset.notes);
    const people = peopleOf(asset, mongoUser);
    peripherals.push({
      type: monitor ? "Monitor" : "Teléfono",
      serial: asset.serialNumber,
      inventory: asset.inventoryNumber,
      brand: asset.brand,
      model: asset.model,
      name: asset.name,
      specs: specs.specs || asset.name,
      status: asset.status,
      situation: people.lastUser ? "Lo dejó un usuario" : "Pendiente de asignar",
      lastUser: people.lastUser,
      finalUser: people.finalUser,
      releasedAt: formatWhen(people.releasedAt),
      ad: specs.ad,
      notes: [specs.position, specs.screen].filter(Boolean).join(" · "),
    });
  }

  stored.sort((a, b) => a.serial.localeCompare(b.serial));
  pending.sort((a, b) => a.origin.localeCompare(b.origin) || a.serial.localeCompare(b.serial));
  peripherals.sort((a, b) => a.type.localeCompare(b.type) || a.serial.localeCompare(b.serial));

  return { stored, pending, peripherals };
}

function styleSheet(sheet: ExcelJS.Worksheet, headerRow: number) {
  const header = sheet.getRow(headerRow);
  header.height = 22;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_FONT }, name: "Calibri", size: 11 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  sheet.autoFilter = {
    from: { row: headerRow, column: 1 },
    to: { row: headerRow, column: header.cellCount },
  };
  sheet.views = [{ state: "frozen", ySplit: headerRow }];
  sheet.eachRow((row, index) => {
    if (index <= headerRow) return;
    row.alignment = { vertical: "middle", wrapText: true };
    if ((index - headerRow) % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_FILL } };
      });
    }
  });
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
  };
}

function writeIntro(sheet: ExcelJS.Worksheet, title: string, detail: string, columns: number) {
  sheet.mergeCells(1, 1, 1, columns);
  sheet.getCell(1, 1).value = title;
  sheet.getCell(1, 1).font = { bold: true, size: 16, color: { argb: HEADER_FILL }, name: "Calibri" };
  sheet.mergeCells(2, 1, 2, columns);
  sheet.getCell(2, 1).value = detail;
  sheet.getCell(2, 1).font = { size: 11, name: "Calibri" };
  sheet.mergeCells(3, 1, 3, columns);
  const when = new Date().toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
    dateStyle: "long",
    timeStyle: "short",
  });
  sheet.getCell(3, 1).value = `Generado ${when} (Ciudad de México)`;
  sheet.getCell(3, 1).font = { italic: true, size: 10, color: { argb: "666666" }, name: "Calibri" };
}

const LAPTOP_HEADERS = [
  "No.",
  "Número de serie",
  "No. inventario",
  "Marca",
  "Modelo",
  "CPU",
  "Características",
  "RAM",
  "Disco",
  "Pantalla",
  "Sistema operativo",
  "Estado",
  "Último usuario",
  "Puesto",
  "AD",
  "AnyDesk",
  "Equipo",
];

function addLaptopSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  title: string,
  detail: string,
  rows: LaptopLine[],
  extraHeaders: string[],
  extra: (row: LaptopLine) => string[]
) {
  const sheet = workbook.addWorksheet(name);
  const headers = [...LAPTOP_HEADERS, ...extraHeaders];
  writeIntro(sheet, title, detail, headers.length);
  sheet.addRow([]);
  sheet.addRow(headers);
  if (!rows.length) {
    sheet.addRow(["Sin equipos en este grupo."]);
  }
  rows.forEach((row, index) => {
    sheet.addRow([
      index + 1,
      row.serial,
      row.inventory,
      row.brand,
      row.model,
      row.cpu,
      row.specs,
      row.ram,
      row.disk,
      row.screen,
      row.os,
      row.status,
      row.lastUser,
      row.position,
      row.ad,
      row.anydesk,
      row.notes,
      ...extra(row),
    ]);
  });
  sheet.columns = headers.map((header, index) => ({
    width: index === 0 ? 6 : index === 6 || index === 16 ? 42 : header.length > 16 ? 22 : 18,
  }));
  styleSheet(sheet, 5);
}

export async function buildPendingWorkbook() {
  const { stored, pending, peripherals } = await loadPendingReport();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AssetDesk";
  workbook.created = new Date();

  addLaptopSheet(
    workbook,
    "Laptops almacenadas",
    "Laptops almacenadas para sacar",
    "Equipos en estado Stock. Incluye número de serie, modelo, características y el último usuario cuando existe.",
    stored,
    ["Liberado el"],
    (row) => [row.releasedAt]
  );

  addLaptopSheet(
    workbook,
    "Laptops por asignar",
    "Laptops pendientes de asignar",
    "Nuevas y usadas que se pueden asignar: almacén (Stock) y liberadas que siguen en estado Activo. Usuario final solo si ya hay alguien asignado.",
    pending,
    ["Origen", "Tipo", "Usuario final", "Liberado el"],
    (row) => [row.origin, row.kind, row.finalUser, row.releasedAt]
  );

  const peripheralHeaders = [
    "No.",
    "Tipo",
    "Número de serie",
    "No. inventario",
    "Marca",
    "Modelo",
    "Nombre",
    "Características",
    "Estado",
    "Situación",
    "Último usuario",
    "Usuario final",
    "Liberado el",
    "AD",
    "Notas",
  ];
  const sheet = workbook.addWorksheet("Monitores y telefonos");
  writeIntro(
    sheet,
    "Monitores y teléfonos sin usuario",
    "Pendientes de asignar o que un usuario dejó. No incluye los que siguen asignados.",
    peripheralHeaders.length
  );
  sheet.addRow([]);
  sheet.addRow(peripheralHeaders);
  if (!peripherals.length) {
    sheet.addRow(["No hay monitores ni teléfonos pendientes de asignar."]);
  }
  peripherals.forEach((row, index) => {
    sheet.addRow([
      index + 1,
      row.type,
      row.serial,
      row.inventory,
      row.brand,
      row.model,
      row.name,
      row.specs,
      row.status,
      row.situation,
      row.lastUser,
      row.finalUser,
      row.releasedAt,
      row.ad,
      row.notes,
    ]);
  });
  sheet.columns = peripheralHeaders.map((header, index) => ({
    width: index === 0 ? 6 : index === 7 || index === 14 ? 36 : 20,
  }));
  styleSheet(sheet, 5);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function pendingReportFilename(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return `assetdesk-por-asignar-${parts}.xlsx`;
}
