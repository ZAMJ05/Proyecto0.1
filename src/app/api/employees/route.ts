import { prisma } from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/auth";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";

export async function GET() {
  try {
    await requireSession();
    const employees = await prisma.employee.findMany({
      orderBy: { name: "asc" },
      include: {
        position: true,
        assignments: {
          where: { unassignedAt: null },
          include: { asset: true },
        },
      },
    });
    return jsonOk({ employees });
  } catch (error) {
    return handleApiError(error);
  }
}

async function findDuplicateEmployee(opts: {
  name: string;
  email: string | null;
  excludeId?: string;
}) {
  const nameNorm = opts.name.trim().toLowerCase();
  const emailNorm = opts.email?.trim().toLowerCase() || null;

  if (emailNorm) {
    const byEmail = await prisma.employee.findFirst({
      where: {
        email: emailNorm,
        ...(opts.excludeId ? { id: { not: opts.excludeId } } : {}),
      },
      select: { id: true, name: true, email: true },
    });
    if (byEmail) {
      return {
        kind: "email" as const,
        message: `Usuario duplicado: el email "${emailNorm}" ya pertenece a ${byEmail.name}.`,
      };
    }
  }

  const all = await prisma.employee.findMany({
    where: opts.excludeId ? { id: { not: opts.excludeId } } : undefined,
    select: { id: true, name: true, email: true, active: true },
  });
  const byName = all.find((e) => e.name.trim().toLowerCase() === nameNorm);
  if (byName) {
    return {
      kind: "name" as const,
      message: `Usuario duplicado: ya existe "${byName.name}"${
        byName.active ? "" : " (marcado como ya no trabaja aquí)"
      }. Edítalo en lugar de crear otro.`,
    };
  }

  return null;
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = body.email ? String(body.email).trim().toLowerCase() : null;
    const department = body.department ? String(body.department).trim() : null;
    const positionId = body.positionId || null;

    if (!name) return jsonError("El nombre es obligatorio");

    const duplicate = await findDuplicateEmployee({ name, email });
    if (duplicate) return jsonError(duplicate.message, 409);

    const employee = await prisma.employee.create({
      data: { name, email, department, positionId, active: true },
      include: { position: true },
    });

    return jsonOk({ employee }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
