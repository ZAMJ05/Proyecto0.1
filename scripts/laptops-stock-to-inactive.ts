/**
 * Cambia laptops en estado Stock → Inactivo.
 * No toca otras categorías ni bajas.
 *
 * Uso: npm run db:laptops-stock-to-inactive
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("DATABASE_URL =", process.env.DATABASE_URL);

  const targets = await prisma.asset.findMany({
    where: { category: "Laptop", status: "Stock" },
    select: { id: true, name: true, serialNumber: true },
  });

  if (targets.length === 0) {
    console.log("No hay laptops en Stock. Nada que cambiar.");
    return;
  }

  console.log(`Se actualizarán ${targets.length} laptop(s) Stock → Inactivo:`);
  for (const a of targets) {
    console.log(`  - ${a.name} (${a.serialNumber})`);
  }

  const result = await prisma.asset.updateMany({
    where: { category: "Laptop", status: "Stock" },
    data: { status: "Inactivo" },
  });

  await prisma.activityLog.createMany({
    data: targets.map((a) => ({
      assetId: a.id,
      action: "Cambio estado",
      details: `Laptop ${a.name} pasó de Stock a Inactivo (ajuste masivo)`,
    })),
  });

  console.log(`Listo: ${result.count} laptop(s) actualizadas a Inactivo.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
