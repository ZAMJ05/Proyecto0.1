import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

if (!globalForPrisma.prisma && process.env.DATABASE_URL) {
  // Ayuda a diagnosticar si se esta usando otra BD por ruta relativa
  if (process.env.NODE_ENV !== "production") {
    console.info("[AssetDesk] DATABASE_URL =", process.env.DATABASE_URL);
  }
}

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
