import "dotenv/config";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

/**
 * Alinea inventario con la hoja de escritorios (imagen) SOLO donde no coincide.
 * - Si la hoja trae serial, ese equipo queda Activo y asignado a esa persona.
 * - Laptops activas de más (otro serial) se liberan y siguen en estado Activo
 *   para volver a asignarse desde Stock.
 * - Celdas vacías no borran datos existentes.
 *
 * Uso: npm run db:sync-desk
 * Se aplica una sola vez por versión de la hoja (data/.desk-sheet-applied).
 */

const prisma = new PrismaClient();
const MARKER = path.join(process.cwd(), "data", ".desk-sheet-applied");

type Laptop = { name: string; serial: string };
type Monitor = { name: string; serial: string };

type Row = {
  user: string;
  /** Si se indica, renombra al empleado encontrado (correcciones de la hoja). */
  rename?: string;
  aliases?: string[];
  ad?: string;
  laptop?: Laptop;
  mouse?: string;
  monitor?: Monitor | "NO";
  cables?: string;
  phone?: boolean;
  keyboard?: "SI" | "NO" | "NUMERICO";
  otros?: string;
};

const ROWS: Row[] = [
  { user: "GEOVANNY JIMENEZ", ad: "CUA-SISTEMAS", laptop: { name: "HP 250 15.6 inch G9 Notebook PC", serial: "CND4101W71" }, mouse: "DELL MS3320W", monitor: { name: "SAMSUNG LS24D300GALXZX", serial: "0WMGHNCYA00634K" }, cables: "1M Y 3M", phone: true, keyboard: "NO", otros: "MULTICONTACTO" },
  { user: "SONIA GOVEA", ad: "CUA-AUDITORIA", laptop: { name: "HP 240R 14 inch G10 Notebook PC", serial: "1H950505RZ" }, mouse: "DELL MS3320W", monitor: { name: "SAMSUNG LS24D300GALXZX", serial: "0WMGHNCYR00743A" }, cables: "1M Y 3M", phone: true, keyboard: "NO", otros: "ETHERNET USB" },
  { user: "ADRIANA ZAMUDIO", rename: "ADRIANA ZAMUDIO", aliases: ["ADRIAN ZAMUDIO"], ad: "CUA-RIESGOS3", laptop: { name: "DELL VOSTRO 3400", serial: "FXW9PS3" }, mouse: "HP 9CP2321NVM", monitor: { name: "HP BTM112", serial: "CNC92338F" }, cables: "1M Y 3M", phone: true, keyboard: "NO" },
  { user: "MARIANA MONTEON", ad: "CUA-RIESGOS01", laptop: { name: "HP ProBook 440 14 inch G11 Notebook PC", serial: "5CD4362NQ4" }, mouse: "LOGITECH", monitor: { name: "HP A0VM111", serial: "CNC2501Y61" }, cables: "1M Y 3M", phone: true, keyboard: "NO" },
  { user: "IRIS LIN", ad: "CUA-MCONTROL", laptop: { name: "HP 240R 14 inch G10 Notebook PC", serial: "1H950502NL" }, mouse: "DELL MS3320W", monitor: { name: "SAMSUNG LS24D300GALXZX", serial: "0WMGHNCN500581X" }, cables: "1M Y 3M", phone: true, keyboard: "SI", otros: "ETHERNET USB" },
  { user: "JOSE ALBERTO NAVA", ad: "CUA-SEGUROS02", laptop: { name: "HP 240R 14 inch G10 Notebook PC", serial: "1H9505061F" }, mouse: "DELL MS3320W", monitor: { name: "HP ITNC3.10", serial: "3CQ4320KR1" }, cables: "1M Y 3M", phone: true, keyboard: "NO", otros: "ETHERNET USB - HUB USB" },
  { user: "ARACELI CASTRO", ad: "CUA-ACASTRO1", laptop: { name: "HP ProBook 440 14 inch G11 Notebook PC", serial: "5CD4362NP7" }, mouse: "LOGITECH", monitor: { name: "HP CBM432", serial: "1CR62807J" }, cables: "1M Y 3M", phone: true, keyboard: "NUMERICO" },
  { user: "ALEXIS LEON", ad: "CUA-TESORERIA01", laptop: { name: "HP 240R 14 inch G10 Notebook PC", serial: "1H950502JQ" }, mouse: "NO", monitor: { name: "HP A0VM111", serial: "CNC41910K" }, cables: "1M Y 3M", phone: true, keyboard: "NUMERICO", otros: "ETHERNET USB" },
  { user: "ANDREA HERNANDEZ ABAD", aliases: ["ANDREA ABAD"], ad: "CUA-TESORERIA-M", laptop: { name: "HP 250 G8 Notebook PC", serial: "CND2421P6N" }, mouse: "DELL MS3320W", monitor: { name: "SAMSUNG LS24D300GALXZX", serial: "0WMGHNCYB00748N" }, cables: "1M Y 3M", phone: true, keyboard: "NO", otros: "ETHERNET USB" },
  { user: "LUIS GONZALEZ", ad: "CUA-FACTURA01", laptop: { name: "HP 240R 14 inch G10 Notebook PC", serial: "1H950502J5" }, mouse: "HP 7CH1653DBY", monitor: { name: "HP CBM427", serial: "1CR0170XT2" }, cables: "1M Y 3M", phone: true, keyboard: "SI", otros: "ETHERNET USB" },
  { user: "FERNANDA BACA", ad: "CUA-CARTERA4", laptop: { name: "HP 240R 14 inch G10 Notebook PC", serial: "1H950502P4" }, mouse: "DELL MS3320W", monitor: { name: "SAMSUNG LS24D300GALXZX", serial: "0WMGHNCYB00770Z" }, cables: "1M Y 3M", phone: true, keyboard: "NUMERICO", otros: "ETHERNET USB - HUB USB" },
  { user: "ANDRES BARBA", ad: "CUA-COBRANZA1", laptop: { name: "HP ProBook 440 14 inch G11 Notebook PC", serial: "5CD4362NQ1" }, mouse: "HP 7CH05021MY", monitor: { name: "RIM211a", serial: "3CM2274BNQ" }, cables: "1M Y 3M", phone: true, keyboard: "NUMERICO", otros: "HUB USB" },
  { user: "XIMENA BECARIA", ad: "CUA-BECARIO", laptop: { name: "HP 250 G8 Notebook PC", serial: "CND2223XK9" }, mouse: "NO", cables: "1M Y 3M" },
  { user: "CESAR DE LA TORRE", ad: "CUA-CONTAGSR", mouse: "NO", monitor: { name: "IMM121", serial: "3CQ53623FS" }, cables: "1M Y 3M", phone: true, keyboard: "NO" },
  { user: "KARINA SERRANO GONZALEZ", aliases: ["KARINA SERRANO"], ad: "CUA-CARTERA1N", laptop: { name: "HP ProBook 440 14 inch G9 Notebook PC", serial: "5CD41578QS" }, mouse: "DELL MS3320W", monitor: { name: "ITNC3.10", serial: "3CQ43206W9" }, cables: "1M Y 3M", phone: true, keyboard: "NUMERICO" },
  { user: "ROGELIO SALAZAR", ad: "CUA-FINANZASSR", laptop: { name: "HP ProBook 440 14 inch G9 Notebook PC", serial: "5CD4150T2C" }, mouse: "NO", monitor: { name: "SAMSUNG LS24D300GALXZX", serial: "0WMGHNCND00584W" }, cables: "1M Y 3M", phone: true, keyboard: "NO" },
  { user: "FREDY MAYORGA", rename: "FREDY MAYORGA", aliases: ["FERNANDO MAYORGA", "FREDY MAYORGA"], ad: "CUA-TESORERIA03", laptop: { name: "HP ProBook 440 14 inch G11 Notebook PC", serial: "5CD4362NLP" }, mouse: "HP 9CP232156W", monitor: { name: "RIM211a", serial: "3CM2274BNJ" }, cables: "1M Y 3M", phone: true, keyboard: "SI" },
  { user: "NOE PUGA", ad: "CUA-CONTAB3", laptop: { name: "HP 250 15.6 inch G9 Notebook PC", serial: "CND4101W4W" }, mouse: "DELL MS3320W", monitor: { name: "RIM4111", serial: "3CM0430XS5" }, cables: "1M Y 3M", phone: true, keyboard: "NUMERICO" },
  { user: "DANIEL BAUTISTA", ad: "CUA-CONTAB01", laptop: { name: "HP ProBook 440 14 inch G11 Notebook PC", serial: "5CD4368JHV" }, mouse: "DELL MS3320W", monitor: { name: "BTT122", serial: "3CQ7451HHK" }, cables: "1M Y 3M", phone: true, keyboard: "NUMERICO", otros: "HUB USB" },
  { user: "CLAUDIA TELLO", ad: "CUA-RECEPCION", laptop: { name: "HP 240R 14 inch G10 Notebook PC", serial: "1H950502BM" }, mouse: "HP 7CH050908FD", monitor: { name: "BTM211", serial: "CNC9251SN2" }, cables: "1M Y 3M", phone: true, keyboard: "NO", otros: "ETHERNET USB" },
  { user: "XIMENA GUERRERO", ad: "CUA-MARKETING", laptop: { name: "HP 250 15.6 inch G9 Notebook PC", serial: "CND32152D1" }, mouse: "DELL MS3320W", monitor: { name: "VG24VQ1B", serial: "CNC92481V" }, cables: "1M Y 3M", phone: true, keyboard: "NO" },
  { user: "PEDRO LOMELII CORNEJO", aliases: ["PEDRO"], ad: "CUA-GCOMERCIAL", laptop: { name: "HP ProBook 440 14 inch G9 Notebook PC", serial: "5CD4150SP9" }, mouse: "DELL MS3320W", monitor: { name: "TDVM111", serial: "CNC93329X" }, cables: "1M Y 3M", phone: true, keyboard: "NO" },
  { user: "TOMAS TRUJILLO", aliases: ["TOMAS"], ad: "CUA-TTRUJILLO1", laptop: { name: "HP ProBook 440 14 inch G11 Notebook PC", serial: "5CD4368JKZ" }, mouse: "HP 9CP3323DDWN", monitor: { name: "AVN112", serial: "CNK8500BFQ" }, cables: "1M Y 3M", phone: true, keyboard: "NUMERICO" },
  { user: "ELIZABETH GRANADOS", rename: "ELIZABETH GRANADOS", aliases: ["ELIZABEHT GRANADOS", "ELIZABETH GRANADOS"], ad: "CUA-OPERACION2", laptop: { name: "HP 240 G8 Notebook PC", serial: "5CG32508CH" }, mouse: "DELL MS3320W", monitor: { name: "ITNC3.10", serial: "3CQ43206WL" }, cables: "1M Y 3M", phone: true, keyboard: "NO" },
  { user: "NITZIA FACIO", aliases: ["NITZIA FACIO MELENDREZ"], ad: "CUA-OPERACION01", laptop: { name: "HP 240R 14 inch G10 Notebook PC", serial: "1H950502SJ" }, mouse: "DELL MS3320W", monitor: { name: "IMM1221", serial: "KIT-MON-CUA-OPERACION01" }, cables: "1M Y 3M", phone: true, keyboard: "NO" },
  { user: "FATIMA GARCIA NUÑEZ", aliases: ["FATIMA GARCIA"], ad: "CUA-SEGUROS1", laptop: { name: "DELL Vostro 15 3530", serial: "JRPZNY3" }, monitor: { name: "IMM1221", serial: "3CQ5240GLB" }, cables: "1M Y 3M", phone: true, keyboard: "SI", otros: "2546LOD22P5S" },
  { user: "JOSE LUIS MORENO", aliases: ["JOSE LUIS", "JOSE LIUS MORENO"], ad: "CUA-GESTORIA02" },
  { user: "MARIANO GOMEZ", aliases: ["MARIANO"], ad: "CUA-MGOMEZN" },
  { user: "ALEJANDRO UGALDE", aliases: ["ALEJANDOR UGALDE"], ad: "CUA-UGALDEN" },
  { user: "ALEJANDRO RODRIGUEZ", ad: "CUA-JURIDICO", monitor: { name: "AVN112", serial: "CNK7461FQK" } },
  { user: "LETICIA CENDEJAS", rename: "LETICIA CENDEJAS", aliases: ["LETICIA"], ad: "CUA-VENTAS7" },
  { user: "TERESA ULLOA", ad: "CUA-VENTAST" },
  { user: "ISSAC RAMOS", rename: "ISSAC RAMOS", aliases: ["ISSACK RAMOS", "ISSAC RAMOS"], ad: "CUA-VENTAS4" },
  { user: "CELIA MEDINA", ad: "CUA-VENTAS01" },
  { user: "BERENICE TORRES", ad: "CUA-COORDINA1" },
];

function norm(value?: string | null) {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function sheetHash() {
  return crypto.createHash("sha256").update(JSON.stringify(ROWS)).digest("hex");
}

function isNo(value?: string | null) {
  const v = norm(value);
  return !v || v === "NO" || v === "N/A" || v === "-";
}

function brandOf(name: string) {
  const n = name.toUpperCase();
  if (n.startsWith("HP") || n.includes("HP ")) return "HP";
  if (n.startsWith("DELL") || n.includes("VOSTRO")) return "DELL";
  if (n.startsWith("SAMSUNG")) return "SAMSUNG";
  if (n.startsWith("LOGITECH")) return "LOGITECH";
  const first = name.split(/\s+/)[0];
  return first || "N/D";
}

function modelOf(name: string, brand: string) {
  const rest = name.replace(new RegExp(`^${brand}\\s*`, "i"), "").trim();
  return rest || name;
}

function withAd(notes: string | null | undefined, ad?: string) {
  if (!ad) return notes || null;
  const token = `AD: ${ad}`;
  const current = notes || "";
  if (/AD:\s*[^|]*/i.test(current)) {
    const next = current.replace(/AD:\s*[^|]*/i, token);
    return next === current ? current : next;
  }
  return current ? `${current} | ${token}` : token;
}

function namesFor(row: Row) {
  return [row.user, row.rename, ...(row.aliases || [])].filter(Boolean) as string[];
}

async function main() {
  const hash = sheetHash();
  if (fs.existsSync(MARKER) && fs.readFileSync(MARKER, "utf8").trim() === hash) {
    console.log("Hoja de escritorios ya aplicada. Sin cambios.");
    return;
  }

  const assetCount = await prisma.asset.count();
  if (assetCount === 0) {
    console.log("BD sin equipos. Omite sync (importa el inventario primero).");
    return;
  }

  const employees = await prisma.employee.findMany();
  const byName = new Map(employees.map((e) => [norm(e.name), e]));

  async function ensureEmployee(row: Row) {
    let found =
      namesFor(row)
        .map((n) => byName.get(norm(n)))
        .find(Boolean) || null;
    const display = row.rename || row.user;
    if (!found) {
      found = await prisma.employee.create({
        data: { name: display, active: true },
      });
      byName.set(norm(found.name), found);
      console.log(`+ usuario ${display}`);
      return found;
    }
    if (row.rename && found.name !== row.rename) {
      const renamed = await prisma.employee.update({
        where: { id: found.id },
        data: { name: row.rename },
      });
      byName.delete(norm(found.name));
      byName.set(norm(renamed.name), renamed);
      console.log(`~ nombre ${found.name} → ${row.rename}`);
      return renamed;
    }
    return found;
  }

  async function findBySerial(serial: string) {
    return prisma.asset.findUnique({ where: { serialNumber: serial } });
  }

  async function assignTo(assetId: string, employeeId: string, note: string) {
    const open = await prisma.assignment.findFirst({
      where: { assetId, unassignedAt: null },
    });
    if (open?.employeeId === employeeId) return false;
    if (open) {
      await prisma.assignment.update({
        where: { id: open.id },
        data: {
          unassignedAt: new Date(),
          notes: open.notes
            ? `${open.notes} · Reasignado según hoja de escritorios`
            : "Reasignado según hoja de escritorios",
        },
      });
    }
    await prisma.assignment.create({
      data: { assetId, employeeId, notes: note },
    });
    return true;
  }

  async function releaseKeepActive(assetId: string, reason: string) {
    const open = await prisma.assignment.findMany({
      where: { assetId, unassignedAt: null },
    });
    if (!open.length) return false;
    const now = new Date();
    for (const a of open) {
      await prisma.assignment.update({
        where: { id: a.id },
        data: {
          unassignedAt: now,
          notes: a.notes ? `${a.notes} · ${reason}` : reason,
        },
      });
    }
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    await prisma.activityLog.create({
      data: {
        assetId,
        action: "Liberación",
        details: `${asset?.name || "Equipo"} ${reason}. Sigue en estado Activo y disponible en Stock.`,
      },
    });
    return true;
  }

  async function upsertPiece(opts: {
    serial: string;
    name: string;
    category: string;
    employeeId: string;
    ad?: string;
  }) {
    const brand = brandOf(opts.name);
    const model = modelOf(opts.name, brand);
    let asset = await findBySerial(opts.serial);
    if (!asset) {
      asset = await prisma.asset.create({
        data: {
          name: opts.name,
          category: opts.category,
          brand,
          model,
          serialNumber: opts.serial,
          inventoryNumber: opts.serial,
          status: "Activo",
          purchaseDate: new Date("2022-01-01"),
          notes: withAd(null, opts.ad),
        },
      });
      console.log(`+ ${opts.category} ${opts.serial} ${opts.name}`);
    } else {
      const notes = withAd(asset.notes, opts.ad);
      const data: {
        name?: string;
        status?: string;
        notes?: string | null;
        category?: string;
      } = {};
      if (asset.name !== opts.name) data.name = opts.name;
      if (asset.category !== opts.category) data.category = opts.category;
      if (asset.status !== "Activo" && asset.status !== "Reparacion") data.status = "Activo";
      if (notes !== asset.notes) data.notes = notes;
      if (Object.keys(data).length) {
        asset = await prisma.asset.update({ where: { id: asset.id }, data });
        console.log(`~ ${opts.serial} ${opts.name}`);
      }
    }
    const moved = await assignTo(
      asset.id,
      opts.employeeId,
      "Asignado según hoja de escritorios"
    );
    if (moved) console.log(`→ ${opts.serial} asignado`);
    return asset.id;
  }

  const claimedLaptopSerials = new Set(
    ROWS.map((r) => r.laptop?.serial.toUpperCase()).filter(Boolean) as string[]
  );

  for (const row of ROWS) {
    const employee = await ensureEmployee(row);
    if (row.laptop) {
      const brand = brandOf(row.laptop.name);
      let laptop = await findBySerial(row.laptop.serial);
      if (!laptop) {
        laptop = await prisma.asset.create({
          data: {
            name: row.laptop.name,
            category: "Laptop",
            brand,
            model: modelOf(row.laptop.name, brand),
            serialNumber: row.laptop.serial,
            inventoryNumber: row.laptop.serial,
            status: "Activo",
            purchaseDate: new Date("2022-01-01"),
            renewalDate: new Date("2026-01-01"),
            notes: withAd(null, row.ad),
          },
        });
        console.log(`+ laptop ${row.laptop.serial} para ${employee.name}`);
      } else {
        const notes = withAd(laptop.notes, row.ad);
        const data: Record<string, unknown> = {};
        if (laptop.name !== row.laptop.name) data.name = row.laptop.name;
        if (laptop.status !== "Activo" && laptop.status !== "Reparacion") data.status = "Activo";
        if (notes !== laptop.notes) data.notes = notes;
        if (Object.keys(data).length) {
          laptop = await prisma.asset.update({ where: { id: laptop.id }, data });
          console.log(`~ laptop ${row.laptop.serial}`);
        }
      }
      await assignTo(laptop.id, employee.id, "Asignado según hoja de escritorios");
    } else if (row.ad) {
      const open = await prisma.assignment.findMany({
        where: { employeeId: employee.id, unassignedAt: null, asset: { category: "Laptop", status: "Activo" } },
        include: { asset: true },
      });
      if (open.length === 1) {
        const notes = withAd(open[0].asset.notes, row.ad);
        if (notes !== open[0].asset.notes) {
          await prisma.asset.update({
            where: { id: open[0].assetId },
            data: { notes },
          });
          console.log(`~ AD ${employee.name} → ${row.ad}`);
        }
      }
    }
  }

  for (const row of ROWS) {
    if (!row.laptop) continue;
    const employee = await ensureEmployee(row);
    const extras = await prisma.assignment.findMany({
      where: {
        employeeId: employee.id,
        unassignedAt: null,
        asset: { category: "Laptop", status: "Activo" },
      },
      include: { asset: true },
    });
    for (const extra of extras) {
      if (extra.asset.serialNumber.toUpperCase() === row.laptop.serial.toUpperCase()) continue;
      if (claimedLaptopSerials.has(extra.asset.serialNumber.toUpperCase())) continue;
      await releaseKeepActive(
        extra.assetId,
        `liberado de ${employee.name}: la hoja indica otra laptop`
      );
      console.log(`↩ laptop extra ${extra.asset.serialNumber} de ${employee.name} → stock (Activo)`);
    }
  }

  for (const row of ROWS) {
    const employee = await ensureEmployee(row);
    const ad = row.ad || norm(employee.name).replace(/\s+/g, "-");

    if (row.mouse !== undefined) {
      if (isNo(row.mouse)) {
        const mice = await prisma.assignment.findMany({
          where: { employeeId: employee.id, unassignedAt: null, asset: { category: "Mouse" } },
        });
        for (const m of mice) {
          await releaseKeepActive(m.assetId, `mouse liberado de ${employee.name} (hoja: NO)`);
        }
      } else if (row.mouse) {
        await upsertPiece({
          serial: `KIT-MOUSE-${ad}`,
          name: row.mouse,
          category: "Mouse",
          employeeId: employee.id,
          ad: row.ad,
        });
      }
    }

    if (row.monitor === "NO") {
      const mons = await prisma.assignment.findMany({
        where: { employeeId: employee.id, unassignedAt: null, asset: { category: "Monitor" } },
      });
      for (const m of mons) {
        await releaseKeepActive(m.assetId, `monitor liberado de ${employee.name} (hoja: NO)`);
      }
    } else if (row.monitor) {
      const taken = await findBySerial(row.monitor.serial);
      const open = taken
        ? await prisma.assignment.findFirst({
            where: { assetId: taken.id, unassignedAt: null },
          })
        : null;
      if (open && open.employeeId !== employee.id) {
        console.log(`! serial de monitor ${row.monitor.serial} ya está con otro usuario; se omite`);
      } else {
        await upsertPiece({
          serial: row.monitor.serial,
          name: row.monitor.name,
          category: "Monitor",
          employeeId: employee.id,
          ad: row.ad,
        });
      }
    }

    if (row.cables && !isNo(row.cables)) {
      await upsertPiece({
        serial: `KIT-CABLES-${ad}`,
        name: `Cables ${row.cables}`,
        category: "Otros",
        employeeId: employee.id,
        ad: row.ad,
      });
    }

    if (row.phone === true) {
      await upsertPiece({
        serial: `KIT-TEL-${ad}`,
        name: "Teléfono",
        category: "Otros",
        employeeId: employee.id,
        ad: row.ad,
      });
    } else if (row.phone === false) {
      const phone = await findBySerial(`KIT-TEL-${ad}`);
      if (phone) await releaseKeepActive(phone.id, `teléfono liberado de ${employee.name}`);
    }

    if (row.keyboard && row.keyboard !== "NO") {
      await upsertPiece({
        serial: `KIT-TECLADO-${ad}`,
        name: row.keyboard === "NUMERICO" ? "Teclado numérico" : "Teclado",
        category: "Teclado",
        employeeId: employee.id,
        ad: row.ad,
      });
    } else if (row.keyboard === "NO") {
      const keys = await prisma.assignment.findMany({
        where: {
          employeeId: employee.id,
          unassignedAt: null,
          asset: { category: "Teclado", serialNumber: { startsWith: "KIT-TECLADO-" } },
        },
      });
      for (const k of keys) {
        await releaseKeepActive(k.assetId, `teclado liberado de ${employee.name} (hoja: NO)`);
      }
    }

    if (row.otros && !isNo(row.otros)) {
      await upsertPiece({
        serial: `KIT-OTROS-${ad}`,
        name: row.otros,
        category: "Otros",
        employeeId: employee.id,
        ad: row.ad,
      });
    }
  }

  fs.mkdirSync(path.dirname(MARKER), { recursive: true });
  fs.writeFileSync(MARKER, hash);
  console.log("Hoja de escritorios aplicada.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
