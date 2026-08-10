export const ASSET_CATEGORIES = [
  "Laptop",
  "Monitor",
  "Mouse",
  "Firewall",
  "Switch",
  "Adaptador",
  "MeetingBar",
  "AccesPoint",
  "Teclado",
  "Dock",
  "Otros",
] as const;

export const ASSET_STATUSES = [
  "Activo",
  "Inactivo",
  "Stock",
  "Baja",
  "Reparacion",
] as const;

export const COMPUTING_CATEGORIES = ["Laptop", "Monitor", "MeetingBar"] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  Laptop: "Laptop",
  Monitor: "Monitor",
  Mouse: "Mouse",
  Firewall: "Firewall",
  Switch: "Switch",
  Adaptador: "Adaptador",
  MeetingBar: "MeetingBar",
  AccesPoint: "Access Point",
  Teclado: "Teclado",
  Dock: "Dock",
  Otros: "Otros",
};

export function addYears(date: Date, years: number) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

export function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
