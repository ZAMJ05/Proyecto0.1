const PARTICLES = new Set([
  "DE",
  "DEL",
  "LA",
  "LAS",
  "LOS",
  "Y",
  "E",
  "DA",
  "DAS",
  "DO",
  "DOS",
  "VAN",
  "VON",
]);

export const FULL_NAME_ERROR =
  "El nombre debe incluir al menos un nombre y dos apellidos. Ejemplo: Ana López García o César de la Torre.";

export type PersonMatchKind =
  | "igual"
  | "typo"
  | "prefijo"
  | "nombre-corto"
  | "intermedio";

export function normalizePersonName(value: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function significantTokens(value: string): string[] {
  const normalized = normalizePersonName(value);
  if (!normalized) return [];
  return normalized.split(" ").filter((token) => !PARTICLES.has(token));
}

function rawTokens(value: string): string[] {
  const normalized = normalizePersonName(value);
  return normalized ? normalized.split(" ") : [];
}

/** Nombre + dos apellidos. Un apellido compuesto (de la Torre) también cuenta. */
export function fullNameError(value: string): string | null {
  const raw = rawTokens(value);
  const significant = raw.filter((token) => !PARTICLES.has(token));
  if (raw.length >= 3 && significant.length >= 2) return null;
  return FULL_NAME_ERROR;
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function isAdjacentTransposition(a: string, b: string): boolean {
  if (a.length !== b.length || a.length < 4) return false;
  const diffs: number[] = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diffs.push(i);
  }
  if (diffs.length !== 2 || diffs[1] !== diffs[0] + 1) return false;
  return a[diffs[0]] === b[diffs[1]] && a[diffs[1]] === b[diffs[0]];
}

function tokenTypo(a: string, b: string): boolean {
  if (a === b) return false;
  const minLen = Math.min(a.length, b.length);
  if (minLen < 4 || a[0] !== b[0]) return false;
  if (isAdjacentTransposition(a, b)) return true;
  return editDistance(a, b) === 1 && minLen >= 5;
}

function tokensEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((token, index) => token === b[index]);
}

function typoTokens(a: string[], b: string[]): boolean {
  if (a.length < 2 || a.length !== b.length) return false;
  let diffs = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (!tokenTypo(a[i], b[i])) return false;
    diffs += 1;
    if (diffs > 1) return false;
  }
  return diffs === 1;
}

function isStrictPrefix(short: string[], long: string[]): boolean {
  if (short.length < 2 || long.length <= short.length) return false;
  return short.every((token, index) => token === long[index]);
}

function isLeadingGivenDropped(short: string[], long: string[]): boolean {
  return (
    long.length === 3 &&
    short.length === 2 &&
    short[0] === long[1] &&
    short[1] === long[2]
  );
}

function isOneExtraToken(short: string[], long: string[]): boolean {
  if (short.length < 2 || long.length !== short.length + 1) return false;
  if (short[0] !== long[0] || short[short.length - 1] !== long[long.length - 1]) {
    return false;
  }
  let index = 0;
  let skipped = 0;
  for (const token of long) {
    if (index < short.length && short[index] === token) index += 1;
    else skipped += 1;
  }
  return index === short.length && skipped === 1;
}

export function personMatchKind(a: string, b: string): PersonMatchKind | null {
  const left = significantTokens(a);
  const right = significantTokens(b);
  if (!left.length || !right.length) return null;
  if (tokensEqual(left, right)) return "igual";
  if (typoTokens(left, right)) return "typo";
  if (isStrictPrefix(left, right) || isStrictPrefix(right, left)) return "prefijo";
  if (isLeadingGivenDropped(left, right) || isLeadingGivenDropped(right, left)) {
    return "nombre-corto";
  }
  if (isOneExtraToken(left, right) || isOneExtraToken(right, left)) return "intermedio";
  return null;
}

/** Misma persona por nombre y apellidos. No une un solo nombre con varios candidatos. */
export function samePerson(a: string, b: string): boolean {
  const kind = personMatchKind(a, b);
  if (!kind) return false;
  if (kind === "igual" && significantTokens(a).length < 2) return false;
  return true;
}

export function assertPersonNameRules(): void {
  const accept = [
    "CESAR DE LA TORRE",
    "JOSE ALBERTO NAVA",
    "PEDRO LOMELII CORNEJO",
    "FATIMA GARCIA NUÑEZ",
    "ANA LOPEZ GARCIA",
    "César de la Torre",
  ];
  const reject = ["PEDRO", "TOMAS", "MARIANO", "LETICIA", "JOSE LUIS", "JOSE MIGUEL", "DE LA TORRE", ""];
  for (const name of accept) {
    if (fullNameError(name)) throw new Error(`Debió aceptarse: ${name}`);
  }
  for (const name of reject) {
    if (!fullNameError(name)) throw new Error(`Debió rechazarse: ${name || "(vacío)"}`);
  }

  const same: Array<[string, string]> = [
    ["JOSE LIUS MORENO", "JOSE LUIS MORENO"],
    ["JOCELYN GUERRERI", "JOCELYN GUERRERO"],
    ["PAMELA SOLORIA", "PAMELA SOLORIO"],
    ["PAULINA DUATT", "PAULINA DAUTT"],
    ["ISSACK RAMOS", "ISSAC RAMOS"],
    ["ELIZABEHT GRANADOS", "ELIZABETH GRANADOS"],
    ["ALEJANDOR UGALDE", "ALEJANDRO UGALDE"],
    ["ADRIAN ZAMUDIO", "ADRIANA ZAMUDIO"],
    ["NITZIA FACIO", "NITZIA FACIO MELENDREZ"],
    ["JUAN PABLO", "JUAN PABLO BARAJAS"],
    ["ALBERTO NAVA", "JOSE ALBERTO NAVA"],
    ["FATIMA GARCIA", "FATIMA GARCIA NUÑEZ"],
    ["ANDREA ABAD", "ANDREA HERNANDEZ ABAD"],
    ["KARINA SERRANO", "KARINA SERRANO GONZALEZ"],
    ["CESAR DE LA TORRE", "CESAR TORRE"],
  ];
  const different: Array<[string, string]> = [
    ["JOSE LUIS MORENO", "JOSE ALBERTO NAVA"],
    ["JOSE MIGUEL", "JOSE LUIS MORENO"],
    ["XIMENA GUERRERO", "XIMENA SERRANO"],
    ["XIMENA GUERRERO", "XIMENA BECARIA"],
    ["XIMENA GUERRERO", "JOCELYN GUERRERO"],
    ["ALEJANDRO RODRIGUEZ", "ALEJANDRO UGALDE"],
    ["ALEJANDRO RODRIGUEZ", "ALEJANDRO CARRIZALES"],
    ["PEDRO LOMELII CORNEJO", "PEDRO SOLIS RODRIGUEZ"],
    ["NITZIA CARTERA", "NITZIA FACIO"],
    ["NITZIA CARTERA", "NITZIA FACIO MELENDREZ"],
    ["FREDY MAYORGA", "FERNANDO MAYORGA"],
    ["LUIS GONZALEZ", "JOSE LUIS MORENO"],
    ["KARINA SERRANO", "XIMENA SERRANO"],
    ["IRIS LIN", "IRIS LOPEZ"],
  ];
  for (const [left, right] of same) {
    if (!samePerson(left, right)) throw new Error(`Debió coincidir: ${left} = ${right}`);
  }
  for (const [left, right] of different) {
    if (samePerson(left, right)) throw new Error(`No debía coincidir: ${left} = ${right}`);
  }
}
