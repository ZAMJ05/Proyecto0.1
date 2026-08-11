/**
 * Importa datos exportados de MongoDB hacia SQLite (Prisma).
 *
 * Uso recomendado:
 * 1) Exporta colecciones a JSON (mongoexport o Compass)
 * 2) Colócalas en data/mongo-export/
 * 3) Ajusta FIELD_MAP abajo si tus nombres de campo son distintos
 * 4) npm run db:import
 *
 * Archivos esperados (opcional cada uno):
 *   positions.json
 *   employees.json
 *   assets.json
 *   assignments.json
 *   maintenances.json
 *   users.json
 */
import "dotenv/config";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { addYears } from "../src/lib/constants";

const prisma = new PrismaClient();
const DATA_DIR = path.join(process.cwd(), "data", "mongo-export");

console.log("Importando hacia:", process.env.DATABASE_URL || "(DATABASE_URL no definida)");

/** Mapeo: campo destino Prisma <- posibles nombres en Mongo */
const FIELD_MAP = {
  asset: {
    name: ["name", "nombre", "assetName", "Nombre"],
    category: ["category", "categoria", "Categoria", "tipo"],
    brand: ["brand", "marca", "Marca"],
    model: ["model", "modelo", "Modelo"],
    serialNumber: ["serialNumber", "serial", "numeroSerial", "Serial", "NoSerie"],
    inventoryNumber: [
      "inventoryNumber",
      "inventario",
      "NoInventario",
      "inventory",
      "noInventario",
    ],
    status: ["status", "estado", "Estado"],
    purchaseDate: ["purchaseDate", "fechaCompra", "FechaCompra", "compra"],
    renewalDate: ["renewalDate", "fechaRenovacion", "FechaRenovacion"],
    anydesk: ["anydesk", "AnyDesk", "anyDesk"],
    notes: ["notes", "notas", "Notas", "observaciones"],
    mongoId: ["_id", "id"],
  },
  employee: {
    name: ["name", "nombre", "Nombre", "fullName"],
    email: ["email", "correo", "Email"],
    department: ["department", "departamento", "Departamento", "area"],
    active: ["active", "activo", "Activo"],
    positionName: ["position", "puesto", "Puesto", "cargo"],
    mongoId: ["_id", "id"],
  },
  position: {
    name: ["name", "nombre", "Nombre", "puesto"],
    description: ["description", "descripcion", "Descripcion"],
    mongoId: ["_id", "id"],
  },
  assignment: {
    assetRef: ["assetId", "asset", "serial", "serialNumber", "equipo"],
    employeeRef: ["employeeId", "employee", "user", "usuario", "email", "nombreUsuario"],
    assignedAt: ["assignedAt", "fechaAsignacion", "asignadoEn", "createdAt"],
    unassignedAt: ["unassignedAt", "fechaLiberacion", "liberadoEn"],
    notes: ["notes", "notas"],
  },
  maintenance: {
    assetRef: ["assetId", "asset", "serial", "serialNumber"],
    scheduledDate: ["scheduledDate", "fechaProgramada", "fecha"],
    completedDate: ["completedDate", "fechaCompletado"],
    status: ["status", "estado"],
    notes: ["notes", "notas"],
  },
  user: {
    email: ["email", "correo"],
    name: ["name", "nombre"],
    password: ["password", "passwordHash", "clave"],
    role: ["role", "rol"],
  },
} as const;

const CATEGORY_NORMALIZE: Record<string, string> = {
  laptop: "Laptop",
  monitor: "Monitor",
  mouse: "Mouse",
  firewall: "Firewall",
  switch: "Switch",
  adaptador: "Adaptador",
  adapter: "Adaptador",
  meetingbar: "MeetingBar",
  "meeting bar": "MeetingBar",
  accespoint: "AccesPoint",
  "access point": "AccesPoint",
  "acces point": "AccesPoint",
  teclado: "Teclado",
  keyboard: "Teclado",
  dock: "Dock",
  docking: "Dock",
  docs: "Dock",
  otros: "Otros",
  other: "Otros",
};

const STATUS_NORMALIZE: Record<string, string> = {
  activo: "Activo",
  active: "Activo",
  inactivo: "Inactivo",
  inactive: "Inactivo",
  stock: "Stock",
  reserva: "Stock",
  baja: "Baja",
  reparacion: "Reparacion",
  reparación: "Reparacion",
  repair: "Reparacion",
};

function readJson(file: string): Record<string, unknown>[] {
  const full = path.join(DATA_DIR, file);
  if (!fs.existsSync(full)) {
    console.log(`(omitido) No existe ${file}`);
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(full, "utf8"));
  if (Array.isArray(raw)) return raw;
  if (raw && Array.isArray(raw.data)) return raw.data;
  throw new Error(`${file} debe ser un array JSON o { data: [] }`);
}

function pick(
  doc: Record<string, unknown>,
  keys: readonly string[]
): unknown {
  for (const key of keys) {
    if (doc[key] !== undefined && doc[key] !== null && doc[key] !== "") {
      return doc[key];
    }
  }
  return undefined;
}

function asString(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "object" && value !== null && "$oid" in value) {
    return String((value as { $oid: string }).$oid);
  }
  return String(value).trim();
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "object" && value !== null && "$date" in value) {
    return new Date((value as { $date: string }).$date);
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function asBool(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  if (value == null) return fallback;
  const s = String(value).toLowerCase();
  if (["false", "0", "no", "inactivo"].includes(s)) return false;
  return true;
}

function normalizeCategory(value: string): string {
  const key = value.trim().toLowerCase();
  return CATEGORY_NORMALIZE[key] || value.trim() || "Otros";
}

function normalizeStatus(value: string): string {
  const key = value.trim().toLowerCase();
  return STATUS_NORMALIZE[key] || value.trim() || "Stock";
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.error(`Crea la carpeta: ${DATA_DIR}`);
    console.error("Y coloca ahí los JSON exportados de MongoDB.");
    process.exit(1);
  }

  const idMap = {
    positions: new Map<string, string>(),
    employees: new Map<string, string>(),
    assets: new Map<string, string>(),
  };

  // 1) Positions
  const positions = readJson("positions.json");
  for (const doc of positions) {
    const name = asString(pick(doc, FIELD_MAP.position.name));
    if (!name) continue;
    const description = asString(pick(doc, FIELD_MAP.position.description)) || null;
    const mongoId = asString(pick(doc, FIELD_MAP.position.mongoId));
    const row = await prisma.position.upsert({
      where: { name },
      update: { description },
      create: { name, description },
    });
    if (mongoId) idMap.positions.set(mongoId, row.id);
    idMap.positions.set(name.toLowerCase(), row.id);
  }
  console.log(`Puestos: ${positions.length}`);

  // 2) Employees
  const employees = readJson("employees.json");
  for (const doc of employees) {
    const name = asString(pick(doc, FIELD_MAP.employee.name));
    if (!name) continue;
    const emailRaw = asString(pick(doc, FIELD_MAP.employee.email));
    const email = emailRaw ? emailRaw.toLowerCase() : null;
    const department =
      asString(pick(doc, FIELD_MAP.employee.department)) || null;
    const active = asBool(pick(doc, FIELD_MAP.employee.active), true);
    const positionName = asString(pick(doc, FIELD_MAP.employee.positionName));
    const mongoId = asString(pick(doc, FIELD_MAP.employee.mongoId));

    let positionId: string | null = null;
    if (positionName) {
      positionId =
        idMap.positions.get(positionName) ||
        idMap.positions.get(positionName.toLowerCase()) ||
        null;
      if (!positionId) {
        const created = await prisma.position.upsert({
          where: { name: positionName },
          update: {},
          create: { name: positionName },
        });
        positionId = created.id;
        idMap.positions.set(positionName.toLowerCase(), created.id);
      }
    }

    const row = email
      ? await prisma.employee.upsert({
          where: { email },
          update: { name, department, active, positionId },
          create: { name, email, department, active, positionId },
        })
      : await prisma.employee.create({
          data: { name, email, department, active, positionId },
        });

    if (mongoId) idMap.employees.set(mongoId, row.id);
    if (email) idMap.employees.set(email, row.id);
    idMap.employees.set(name.toLowerCase(), row.id);
  }
  console.log(`Empleados: ${employees.length}`);

  // 3) Assets
  const assets = readJson("assets.json");
  for (const doc of assets) {
    const name = asString(pick(doc, FIELD_MAP.asset.name));
    const serialNumber = asString(pick(doc, FIELD_MAP.asset.serialNumber));
    const inventoryNumber = asString(
      pick(doc, FIELD_MAP.asset.inventoryNumber)
    );
    if (!name || !serialNumber || !inventoryNumber) {
      console.warn("Asset incompleto, se omite:", { name, serialNumber, inventoryNumber });
      continue;
    }

    const purchaseDate =
      asDate(pick(doc, FIELD_MAP.asset.purchaseDate)) || new Date();
    const renewalDate =
      asDate(pick(doc, FIELD_MAP.asset.renewalDate)) ||
      addYears(purchaseDate, 4);
    const category = normalizeCategory(
      asString(pick(doc, FIELD_MAP.asset.category), "Otros")
    );
    const status = normalizeStatus(
      asString(pick(doc, FIELD_MAP.asset.status), "Stock")
    );
    const brand = asString(pick(doc, FIELD_MAP.asset.brand), "N/D");
    const model = asString(pick(doc, FIELD_MAP.asset.model), "N/D");
    const anydesk = asString(pick(doc, FIELD_MAP.asset.anydesk)) || null;
    const notes = asString(pick(doc, FIELD_MAP.asset.notes)) || null;
    const mongoId = asString(pick(doc, FIELD_MAP.asset.mongoId));

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
        anydesk: category === "Laptop" && status === "Activo" ? anydesk : null,
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
        anydesk: category === "Laptop" && status === "Activo" ? anydesk : null,
        notes,
      },
    });

    if (mongoId) idMap.assets.set(mongoId, row.id);
    idMap.assets.set(serialNumber.toLowerCase(), row.id);
  }
  console.log(`Assets: ${assets.length}`);

  // 4) Assignments
  const assignments = readJson("assignments.json");
  let assignmentCount = 0;
  for (const doc of assignments) {
    const assetRef = asString(pick(doc, FIELD_MAP.assignment.assetRef));
    const employeeRef = asString(pick(doc, FIELD_MAP.assignment.employeeRef));
    const assetId =
      idMap.assets.get(assetRef) ||
      idMap.assets.get(assetRef.toLowerCase());
    const employeeId =
      idMap.employees.get(employeeRef) ||
      idMap.employees.get(employeeRef.toLowerCase());
    if (!assetId || !employeeId) {
      console.warn("Asignación sin match:", { assetRef, employeeRef });
      continue;
    }
    await prisma.assignment.create({
      data: {
        assetId,
        employeeId,
        assignedAt: asDate(pick(doc, FIELD_MAP.assignment.assignedAt)) || new Date(),
        unassignedAt: asDate(pick(doc, FIELD_MAP.assignment.unassignedAt)),
        notes: asString(pick(doc, FIELD_MAP.assignment.notes)) || null,
      },
    });
    assignmentCount += 1;
  }
  console.log(`Asignaciones: ${assignmentCount}`);

  // 5) Maintenances
  const maintenances = readJson("maintenances.json");
  let maintCount = 0;
  for (const doc of maintenances) {
    const assetRef = asString(pick(doc, FIELD_MAP.maintenance.assetRef));
    const assetId =
      idMap.assets.get(assetRef) ||
      idMap.assets.get(assetRef.toLowerCase());
    const scheduledDate = asDate(
      pick(doc, FIELD_MAP.maintenance.scheduledDate)
    );
    if (!assetId || !scheduledDate) continue;
    await prisma.maintenance.create({
      data: {
        assetId,
        scheduledDate,
        completedDate: asDate(pick(doc, FIELD_MAP.maintenance.completedDate)),
        status: asString(pick(doc, FIELD_MAP.maintenance.status), "Pendiente"),
        notes: asString(pick(doc, FIELD_MAP.maintenance.notes)) || null,
      },
    });
    maintCount += 1;
  }
  console.log(`Mantenimientos: ${maintCount}`);

  // 6) App users (login)
  const users = readJson("users.json");
  for (const doc of users) {
    const email = asString(pick(doc, FIELD_MAP.user.email)).toLowerCase();
    const name = asString(pick(doc, FIELD_MAP.user.name), email);
    if (!email) continue;
    const roleRaw = asString(pick(doc, FIELD_MAP.user.role), "USER").toUpperCase();
    const role = roleRaw.includes("ADMIN") ? "ADMIN" : "USER";
    const passwordRaw = asString(pick(doc, FIELD_MAP.user.password), "changeme123");
    const passwordHash = passwordRaw.startsWith("$2")
      ? passwordRaw
      : await bcrypt.hash(passwordRaw, 10);

    await prisma.user.upsert({
      where: { email },
      update: { name, role, passwordHash },
      create: { email, name, role, passwordHash },
    });
  }
  console.log(`Usuarios app: ${users.length}`);

  // Garantiza al menos un admin
  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminCount === 0) {
    await prisma.user.create({
      data: {
        email: "admin@inventario.local",
        name: "Administrador IT",
        role: "ADMIN",
        passwordHash: await bcrypt.hash("admin123", 10),
      },
    });
    console.log("Se creó admin@inventario.local / admin123");
  }

  console.log("\nImportación terminada.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
