import "dotenv/config";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import {
  assertPersonNameRules,
  fullNameError,
  normalizePersonName,
  personMatchKind,
  significantTokens,
  type PersonMatchKind,
} from "../src/lib/person-name";

/**
 * Fusiona usuarios del inventario que son la misma persona
 * (nombre corto, apellido faltante o typo de una letra).
 * Se aplica una sola vez (data/.employee-names-merged).
 *
 * Uso: npm run db:merge-names
 */

const prisma = new PrismaClient();
const MARKER = path.join(process.cwd(), "data", ".employee-names-merged");
const VERSION = "v1";

const PREFERRED = new Set(
  [
    "ADRIANA ZAMUDIO",
    "ALEJANDRO RODRIGUEZ",
    "ALEJANDRO UGALDE",
    "ANDREA HERNANDEZ ABAD",
    "ELIZABETH GRANADOS",
    "FATIMA GARCIA NUÑEZ",
    "FREDY MAYORGA",
    "ISSAC RAMOS",
    "JOSE ALBERTO NAVA",
    "JOSE LUIS MORENO",
    "JOCELYN GUERRERO",
    "JUAN PABLO BARAJAS",
    "KARINA SERRANO GONZALEZ",
    "LETICIA CENDEJAS",
    "MARIANO GOMEZ",
    "NITZIA FACIO MELENDREZ",
    "PAMELA SOLORIO",
    "PAULINA DAUTT",
    "PEDRO LOMELII CORNEJO",
    "TOMAS TRUJILLO",
  ].map((name) => normalizePersonName(name))
);

const KNOWN_SAME: Array<[string, string]> = [
  ["FREDY MAYORGA", "FERNANDO MAYORGA"],
];

type Row = {
  id: string;
  name: string;
  email: string | null;
  department: string | null;
  positionId: string | null;
  active: boolean;
  openCount: number;
  totalCount: number;
  sig: string[];
};

function knownSame(a: string, b: string): boolean {
  const left = normalizePersonName(a);
  const right = normalizePersonName(b);
  return KNOWN_SAME.some(([x, y]) => {
    const nx = normalizePersonName(x);
    const ny = normalizePersonName(y);
    return (nx === left && ny === right) || (nx === right && ny === left);
  });
}

function isLongerForm(kind: PersonMatchKind | null, short: Row, candidate: Row): boolean {
  if (candidate.sig.length <= short.sig.length) return false;
  return kind === "prefijo" || kind === "nombre-corto" || kind === "intermedio";
}

function shouldLink(a: Row, b: Row, all: Row[]): boolean {
  if (knownSame(a.name, b.name)) return true;
  const kind = personMatchKind(a.name, b.name);
  if (!kind) return false;
  if (kind === "igual" || kind === "typo") return true;
  const short = a.sig.length <= b.sig.length ? a : b;
  const long = short === a ? b : a;
  const hits = all.filter((candidate) => {
    if (candidate.id === short.id) return false;
    return isLongerForm(personMatchKind(short.name, candidate.name), short, candidate);
  });
  return hits.length === 1 && hits[0].id === long.id;
}

class UnionFind {
  private parent = new Map<string, string>();

  add(id: string) {
    if (!this.parent.has(id)) this.parent.set(id, id);
  }

  find(id: string): string {
    const parent = this.parent.get(id);
    if (!parent || parent === id) return id;
    const root = this.find(parent);
    this.parent.set(id, root);
    return root;
  }

  union(a: string, b: string) {
    const left = this.find(a);
    const right = this.find(b);
    if (left !== right) this.parent.set(left, right);
  }
}

function rank(row: Row): number[] {
  return [
    row.sig.length,
    PREFERRED.has(normalizePersonName(row.name)) ? 1 : 0,
    row.openCount,
    row.totalCount,
    row.department ? 1 : 0,
    row.email ? 1 : 0,
    row.positionId ? 1 : 0,
    row.active ? 1 : 0,
    row.name.length,
  ];
}

function pickCanonical(group: Row[]): Row {
  return group.reduce((best, row) => {
    const left = rank(best);
    const right = rank(row);
    for (let i = 0; i < left.length; i++) {
      if (left[i] !== right[i]) return right[i] > left[i] ? row : best;
    }
    return best;
  });
}

async function main() {
  assertPersonNameRules();

  if (fs.existsSync(MARKER) && fs.readFileSync(MARKER, "utf8").trim() === VERSION) {
    console.log("Fusión de nombres ya aplicada. Sin cambios.");
    return;
  }

  const count = await prisma.employee.count();
  if (count === 0) {
    console.log("BD sin usuarios. Omite la fusión.");
    return;
  }

  const employees = await prisma.employee.findMany({
    include: { _count: { select: { assignments: true } } },
  });
  const openGroups = await prisma.assignment.groupBy({
    by: ["employeeId"],
    where: { unassignedAt: null },
    _count: { _all: true },
  });
  const openById = new Map(openGroups.map((group) => [group.employeeId, group._count._all]));

  const rows: Row[] = employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    email: employee.email,
    department: employee.department,
    positionId: employee.positionId,
    active: employee.active,
    openCount: openById.get(employee.id) || 0,
    totalCount: employee._count.assignments,
    sig: significantTokens(employee.name),
  }));

  const clusters = new UnionFind();
  for (const row of rows) clusters.add(row.id);

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      if (shouldLink(rows[i], rows[j], rows)) clusters.union(rows[i].id, rows[j].id);
    }
  }

  const singles = rows.filter((row) => row.sig.length === 1);
  for (const single of singles) {
    const hits = new Map<string, Row>();
    for (const other of rows) {
      if (other.id === single.id || other.sig.length < 2 || other.sig[0] !== single.sig[0]) {
        continue;
      }
      hits.set(clusters.find(other.id), other);
    }
    if (hits.size === 1) {
      clusters.union(single.id, [...hits.values()][0].id);
      console.log(
        `Nombre corto único: ${single.name} → ${[...hits.values()][0].name}`
      );
    } else if (hits.size > 1) {
      console.log(
        `Ambiguo, no se fusiona "${single.name}": ${[...hits.values()]
          .map((row) => row.name)
          .join(", ")}`
      );
    }
  }

  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const root = clusters.find(row.id);
    const list = grouped.get(root) || [];
    list.push(row);
    grouped.set(root, list);
  }

  let mergedPeople = 0;
  for (const group of grouped.values()) {
    if (group.length < 2) continue;
    const canonical = pickCanonical(group);
    const duplicates = group.filter((row) => row.id !== canonical.id);
    await prisma.$transaction(async (tx) => {
      let current = { ...canonical };
      for (const duplicate of duplicates) {
        const assignments = await tx.assignment.findMany({
          where: { employeeId: duplicate.id },
        });
        let moved = 0;
        for (const assignment of assignments) {
          if (!assignment.unassignedAt) {
            const clash = await tx.assignment.findFirst({
              where: {
                assetId: assignment.assetId,
                employeeId: current.id,
                unassignedAt: null,
              },
            });
            if (clash) {
              await tx.assignment.update({
                where: { id: assignment.id },
                data: {
                  unassignedAt: new Date(),
                  notes: assignment.notes
                    ? `${assignment.notes} · Cerrada al fusionar usuarios duplicados`
                    : "Cerrada al fusionar usuarios duplicados",
                },
              });
              continue;
            }
          }
          await tx.assignment.update({
            where: { id: assignment.id },
            data: { employeeId: current.id },
          });
          moved += 1;
        }

        const patch: {
          email?: string | null;
          department?: string | null;
          positionId?: string | null;
          active?: boolean;
        } = {};
        let droppedEmail = "";
        if (!current.email && duplicate.email) {
          await tx.employee.update({
            where: { id: duplicate.id },
            data: { email: null },
          });
          patch.email = duplicate.email;
          current.email = duplicate.email;
        } else if (current.email && duplicate.email && current.email !== duplicate.email) {
          droppedEmail = duplicate.email;
        }
        if (!current.department && duplicate.department) {
          patch.department = duplicate.department;
          current.department = duplicate.department;
        }
        if (!current.positionId && duplicate.positionId) {
          patch.positionId = duplicate.positionId;
          current.positionId = duplicate.positionId;
        }
        if (!current.active && duplicate.active) {
          patch.active = true;
          current.active = true;
        }
        if (Object.keys(patch).length) {
          await tx.employee.update({ where: { id: current.id }, data: patch });
        }

        await tx.employee.delete({ where: { id: duplicate.id } });
        await tx.activityLog.create({
          data: {
            action: "Usuario inventario",
            details: `Se fusionó "${duplicate.name}" en "${current.name}" (${moved} asignación(es) movidas)${
              droppedEmail ? `. El email ${droppedEmail} no se conservó.` : ""
            }.`,
          },
        });
        console.log(`Fusionado: ${duplicate.name} → ${current.name} (${moved} asignaciones)`);
        mergedPeople += 1;
      }
    });
  }

  const remaining = await prisma.employee.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  });
  const incomplete = remaining.filter((employee) => fullNameError(employee.name));
  console.log(
    mergedPeople
      ? `Listo. ${mergedPeople} registro(s) fusionados.`
      : "Listo. No había duplicados que fusionar."
  );
  if (incomplete.length) {
    console.log(
      `Siguen sin nombre completo (no hubo con quién fusionarlos): ${incomplete
        .map((employee) => employee.name)
        .join(", ")}`
    );
  }

  fs.mkdirSync(path.dirname(MARKER), { recursive: true });
  fs.writeFileSync(MARKER, VERSION);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
