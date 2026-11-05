import { prisma } from "@/lib/prisma";
import {
  fullNameError,
  normalizePersonName,
  samePerson,
} from "@/lib/person-name";

export { fullNameError };

export async function employeeDuplicateMessage(opts: {
  name: string;
  email: string | null;
  excludeId?: string;
  fuzzy: boolean;
}): Promise<string | null> {
  const emailNorm = opts.email?.trim().toLowerCase() || null;
  if (emailNorm) {
    const byEmail = await prisma.employee.findFirst({
      where: {
        email: emailNorm,
        ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
      },
      select: { name: true },
    });
    if (byEmail) {
      return `Usuario duplicado: el email "${emailNorm}" ya pertenece a ${byEmail.name}.`;
    }
  }

  const others = await prisma.employee.findMany({
    where: opts.excludeId ? { id: { not: opts.excludeId } } : undefined,
    select: { name: true, active: true },
  });
  const wanted = normalizePersonName(opts.name);
  const exact = others.find((employee) => normalizePersonName(employee.name) === wanted);
  if (exact) {
    return duplicateNameMessage(opts.name, exact.name, exact.active);
  }
  if (!opts.fuzzy) return null;

  const fuzzy = others.find((employee) => samePerson(employee.name, opts.name));
  if (fuzzy) return duplicateNameMessage(opts.name, fuzzy.name, fuzzy.active);
  return null;
}

function duplicateNameMessage(incoming: string, existing: string, active: boolean) {
  const status = active ? "" : " (marcado como ya no trabaja aquí)";
  return `Usuario duplicado: "${incoming.trim()}" coincide con "${existing}"${status}. Edítalo en lugar de crear otro.`;
}
