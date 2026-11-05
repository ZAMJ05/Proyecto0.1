import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { handleApiError, jsonOk } from "@/lib/api";

export async function GET(request: Request) {
  try {
    await requireSession();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q) return jsonOk({ assets: [], employees: [] });

    const [assets, employees] = await Promise.all([
      prisma.asset.findMany({
        where: {
          OR: [
            { serialNumber: { contains: q } },
            { inventoryNumber: { contains: q } },
            { name: { contains: q } },
            { anydesk: { contains: q } },
          ],
        },
        take: 20,
        include: {
          assignments: {
            where: { unassignedAt: null },
            include: { employee: true },
          },
        },
      }),
      prisma.employee.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
          ],
        },
        take: 20,
        include: {
          position: true,
          assignments: {
            where: { unassignedAt: null },
            include: { asset: true },
          },
        },
      }),
    ]);

    return jsonOk({ assets, employees });
  } catch (error) {
    return handleApiError(error);
  }
}
