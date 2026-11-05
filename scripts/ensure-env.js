const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");
const dataDir = path.join(root, "data");
const dbFile = path.join(dataDir, "assetdesk.db");

// Prisma en Windows acepta bien file:C:/ruta/absoulta.db
const dbUrl =
  "file:" + dbFile.replace(/\\/g, "/");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const defaults = {
  DATABASE_URL: dbUrl,
  JWT_SECRET: "change-me-in-production",
  COOKIE_SECURE: "false",
};

function parseEnv(content) {
  const map = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    map[key] = value;
  }
  return map;
}

function serializeEnv(map) {
  const lines = [
    "# Generado/actualizado por scripts/ensure-env.js",
    "# NO uses db:setup en produccion: borra datos. Usa db:init.",
    `DATABASE_URL="${map.DATABASE_URL}"`,
    `JWT_SECRET="${map.JWT_SECRET || defaults.JWT_SECRET}"`,
    `COOKIE_SECURE="${map.COOKIE_SECURE || defaults.COOKIE_SECURE}"`,
    "",
  ];
  return lines.join("\n");
}

let current = {};
if (fs.existsSync(envPath)) {
  current = parseEnv(fs.readFileSync(envPath, "utf8"));
} else if (fs.existsSync(examplePath)) {
  current = parseEnv(fs.readFileSync(examplePath, "utf8"));
}

// Siempre fijar ruta absoluta a data/assetdesk.db para que
// Task Scheduler / distintos cwd no creen otra base vacia.
current.DATABASE_URL = dbUrl;
if (!current.JWT_SECRET) current.JWT_SECRET = defaults.JWT_SECRET;
if (current.COOKIE_SECURE === undefined || current.COOKIE_SECURE === "") {
  current.COOKIE_SECURE = defaults.COOKIE_SECURE;
}

fs.writeFileSync(envPath, serializeEnv(current), "utf8");
console.log("OK .env actualizado");
console.log("Base de datos:", dbFile);

// Migrar dev.db antiguo (prisma/ o raiz) si existe y la nueva aun no
const legacyPaths = [
  path.join(root, "prisma", "dev.db"),
  path.join(root, "dev.db"),
];
if (!fs.existsSync(dbFile)) {
  for (const legacy of legacyPaths) {
    if (fs.existsSync(legacy)) {
      fs.copyFileSync(legacy, dbFile);
      console.log("Se migro la base antigua:", legacy, "->", dbFile);
      break;
    }
  }
}
