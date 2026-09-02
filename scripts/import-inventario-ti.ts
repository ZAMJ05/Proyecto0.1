/**
 * Importador específico para el export de inventario-ti:
 *   assets.json, people.json, history.json, log.json
 *
 * Uso:
 *   npm run env:init
 *   npm run db:init
 *   npm run db:import:ti
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { addMonths, addYears } from "../src/lib/constants";

const prisma = new PrismaClient();
const DATA_DIR = path.join(process.cwd(), "data", "mongo-export");

type MongoAsset = {
  _id?: { $oid?: string };
  id?: string;
  name?: string;
  category?: string;
  brand?: string;
  model?: string;
  serial?: string;
  tag?: string;
  location?: string;
  assignedTo?: string;
  status?: string;
  purchaseDate?: string;
  warranty?: string;
  price?: number;
  ip?: string;
  os?: string;
  adName?: string;
  anydesk?: string;
  notes?: string;
  lastMaintenance?: string;
};

type MongoPerson = {
  id?: string;
  name?: string;
  department?: string;
  position?: string;
};

type MongoHistory = {
  assetId?: string;
  action?: string;
  time?: string;
  changes?: Array<{ field?: string; label?: string; from?: unknown; to?: unknown }>;
};

type MongoLog = {
  text?: string;
  type?: string;
  time?: string;
};

function readJson<T>(file: string): T[] {
  const full = path.join(DATA_DIR, file);
  if (!fs.existsSync(full)) {
    console.log(`(omitido) No existe ${file}`);
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(full, "utf8"));
  if (!Array.isArray(raw)) throw new Error(`${file} debe ser un array JSON`);
  return raw as T[];
}

function normalizeStatus(status?: string): string {
  const s = (status || "").trim().toLowerCase();
  if (s === "active" || s === "activo") return "Activo";
  if (s === "stored" || s === "stock" || s === "reserva") return "Stock";
  if (s === "retired" || s === "baja") return "Baja";
  if (s === "inactive" || s === "inactivo") return "Inactivo";
  if (s === "repair" || s === "reparacion" || s === "reparación") return "Reparacion";
  return "Stock";
}

function normalizeCategory(category?: string): string {
  const c = (category || "").trim();
  const key = c.toLowerCase();
  const map: Record<string, string> = {
    laptop: "Laptop",
    monitor: "Monitor",
    mouse: "Mouse",
    teclado: "Teclado",
    firewall: "Firewall",
    switch: "Switch",
    adaptador: "Adaptador",
    meetingbar: "MeetingBar",
    "acces point": "AccesPoint",
    "access point": "AccesPoint",
    dock: "Dock",
    otro: "Otros",
    otros: "Otros",
    periferico: "Otros",
    periférico: "Otros",
    pod: "Otros",
    "panel tactil": "Otros",
    "panel táctil": "Otros",
  };
  return map[key] || (c ? c.replace(/\s+/g, "") : "Otros");
}

function parseDate(value?: string | null): Date | null {
  if (!value || !String(value).trim()) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function normName(value?: string) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function buildNotes(a: MongoAsset): string {
  const chunks: string[] = [];
  if (a.notes) chunks.push(String(a.notes));
  if (a.location) chunks.push(`Ubicación: ${a.location}`);
  if (a.os) chunks.push(`SO: ${a.os}`);
  if (a.adName) chunks.push(`AD: ${a.adName}`);
  if (a.ip) chunks.push(`IP: ${a.ip}`);
  if (a.warranty) chunks.push(`Garantía: ${a.warranty}`);
  if (a.price) chunks.push(`Precio: ${a.price}`);
  return chunks.join(" | ");
}

async function main() {
  console.log("DATABASE_URL =", process.env.DATABASE_URL);
  console.log("Leyendo JSON desde", DATA_DIR);

  const assets = readJson<MongoAsset>("assets.json");
  const people = readJson<MongoPerson>("people.json");
  const history = readJson<MongoHistory>("history.json");
  const logs = readJson<MongoLog>("log.json");

  if (!assets.length) {
    throw new Error("No se encontró data/mongo-export/assets.json o está vacío");
  }

  // 1) Puestos
  const positionNames = new Set<string>();
  for (const p of people) {
    if (p.position?.trim()) positionNames.add(p.position.trim());
  }
  // Extraer puestos desde notas de assets ("Puesto: XXX")
  for (const a of assets) {
    const m = String(a.notes || "").match(/Puesto:\s*([^|]+)/i);
    if (m?.[1]?.trim()) positionNames.add(m[1].trim());
  }

  const positionIdByName = new Map<string, string>();
  for (const name of [...positionNames].sort()) {
    const row = await prisma.position.upsert({
      where: { name },
      update: {},
      create: { name, description: "Importado desde MongoDB" },
    });
    positionIdByName.set(normName(name), row.id);
  }
  console.log(`Puestos: ${positionIdByName.size}`);

  // 2) Personas
  const employeeIdByName = new Map<string, string>();

  async function ensureEmployee(
    name: string,
    department?: string | null,
    position?: string | null
  ) {
    const key = normName(name);
    if (!key) return null;
    const existing = employeeIdByName.get(key);
    if (existing) return existing;

    const positionId = position
      ? positionIdByName.get(normName(position)) || null
      : null;

    // Buscar por nombre exacto ya en BD
    const found = await prisma.employee.findFirst({
      where: { name: { equals: name.trim() } },
    });
    if (found) {
      employeeIdByName.set(key, found.id);
      return found.id;
    }

    const created = await prisma.employee.create({
      data: {
        name: name.trim(),
        department: department?.trim() || null,
        positionId,
        active: true,
      },
    });
    employeeIdByName.set(key, created.id);
    return created.id;
  }

  for (const p of people) {
    if (!p.name?.trim()) continue;
    await ensureEmployee(p.name, p.department, p.position);
  }

  // Personas solo referenciadas en assignedTo
  for (const a of assets) {
    if (a.assignedTo?.trim()) {
      await ensureEmployee(a.assignedTo.trim());
    }
  }
  console.log(`Empleados: ${employeeIdByName.size}`);

  // 3) Assets + asignaciones + mantenimiento
  const assetIdByTag = new Map<string, string>();
  const assetIdBySerial = new Map<string, string>();
  let assetCount = 0;
  let assignmentCount = 0;
  let maintenanceCount = 0;
  let skipped = 0;

  for (const a of assets) {
    const tag = (a.tag || a.id || "").trim();
    const rawSerial = (a.serial || "").trim();
    const serialNumber =
      !rawSerial || rawSerial.toUpperCase() === "N/A"
        ? `SIN-SERIAL-${tag || assetCount + 1}`
        : rawSerial;

    const inventoryNumber = tag || `INV-${serialNumber}`;
    const name = (a.name || inventoryNumber).trim();
    if (!name) {
      skipped += 1;
      continue;
    }

    const purchaseDate = parseDate(a.purchaseDate) || new Date("2022-01-01");
    const category = normalizeCategory(a.category);
    const renewalDate =
      category === "Laptop" ? addYears(purchaseDate, 4) : null;
    const status = normalizeStatus(a.status);
    const brand = (a.brand || "N/D").trim();
    const model = (a.model || "N/D").trim();
    let anydesk = (a.anydesk || "").trim() || null;
    if (!(category === "Laptop" && status === "Activo")) anydesk = null;

    const notes = buildNotes(a) || null;

    const row = await prisma.asset.upsert({
      where: { serialNumber },
      update: {
        name,
        category,
        brand,
        model,
        inventoryNumber,
        status,
        purchaseDate,
        renewalDate,
        anydesk,
        notes,
      },
      create: {
        name,
        category,
        brand,
        model,
        serialNumber,
        inventoryNumber,
        status,
        purchaseDate,
        renewalDate,
        anydesk,
        notes,
      },
    });

    assetIdByTag.set(tag, row.id);
    assetIdByTag.set(normName(tag), row.id);
    if (a.id) assetIdByTag.set(String(a.id), row.id);
    assetIdBySerial.set(serialNumber.toUpperCase(), row.id);
    assetCount += 1;

    // Asignación activa
    if (a.assignedTo?.trim() && status === "Activo") {
      const employeeId = await ensureEmployee(a.assignedTo.trim());
      if (employeeId) {
        const open = await prisma.assignment.findFirst({
          where: { assetId: row.id, unassignedAt: null },
        });
        if (!open) {
          await prisma.assignment.create({
            data: {
              assetId: row.id,
              employeeId,
              notes: "Importado desde MongoDB (assignedTo)",
            },
          });
          assignmentCount += 1;
        }
      }
    }

    // Mantenimiento desde lastMaintenance
    const lastMaint = parseDate(a.lastMaintenance);
    if (lastMaint && ["Laptop", "Monitor", "MeetingBar"].includes(category)) {
      await prisma.maintenance.create({
        data: {
          assetId: row.id,
          scheduledDate: lastMaint,
          completedDate: lastMaint,
          status: "Completado",
          notes: "Importado desde lastMaintenance",
        },
      });
      await prisma.maintenance.create({
        data: {
          assetId: row.id,
          scheduledDate: addMonths(lastMaint, 6),
          status: "Pendiente",
          notes: "Siguiente mantenimiento (6 meses)",
        },
      });
      maintenanceCount += 2;
    }
  }
  console.log(
    `Assets: ${assetCount} | Asignaciones: ${assignmentCount} | Mantenimientos: ${maintenanceCount} | Omitidos: ${skipped}`
  );

  // 4) History → ActivityLog
  let historyCount = 0;
  for (const h of history) {
    const assetKey = String(h.assetId || "");
    const assetId =
      assetIdByTag.get(assetKey) ||
      assetIdByTag.get(normName(assetKey)) ||
      null;
    const changeText = (h.changes || [])
      .map((c) => `${c.label || c.field}: ${c.from ?? ""} → ${c.to ?? ""}`)
      .join("; ");
    const details = changeText
      ? `${h.action || "cambio"} | ${changeText}`
      : `${h.action || "cambio"} (sin detalle)`;
    await prisma.activityLog.create({
      data: {
        assetId,
        action: h.action || "Historial",
        details: details.slice(0, 1800),
        createdAt: parseDate(h.time) || new Date(),
      },
    });
    historyCount += 1;
  }
  console.log(`History → ActivityLog: ${historyCount}`);

  // 5) Log → ActivityLog
  let logCount = 0;
  for (const l of logs) {
    await prisma.activityLog.create({
      data: {
        action: l.type || "log",
        details: (l.text || "Evento").slice(0, 1800),
        createdAt: parseDate(l.time) || new Date(),
      },
    });
    logCount += 1;
  }
  console.log(`Log → ActivityLog: ${logCount}`);

  console.log("\nImportación inventario-ti terminada.");
  console.log("Revisa Inventario / Usuarios-Activos / Asignaciones / Dashboard.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
