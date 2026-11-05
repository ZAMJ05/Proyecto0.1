/**
 * Inicializa esquema y crea admin SOLO si la BD esta vacia.
 * Nunca borra datos existentes.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("DATABASE_URL =", process.env.DATABASE_URL);

  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log(`BD ya tiene ${userCount} usuario(s). No se modifica.`);
    return;
  }

  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.create({
    data: {
      email: "admin@inventario.local",
      name: "Administrador IT",
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("BD vacia: se creo admin@inventario.local / admin123");
  console.log("Cambia esa contraseña desde Accesos app.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
