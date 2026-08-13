import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function prismaUniqueMessage(error: Prisma.PrismaClientKnownRequestError) {
  const fields = Array.isArray(error.meta?.target)
    ? (error.meta?.target as string[])
    : typeof error.meta?.target === "string"
      ? [error.meta.target]
      : [];
  const joined = fields.join(",").toLowerCase();

  if (joined.includes("email")) {
    return "Ya existe un usuario con ese email. Usa otro o edita el registro existente.";
  }
  if (joined.includes("serialnumber") || joined.includes("serial_number")) {
    return "Ya existe un equipo con ese número de serie.";
  }
  if (
    joined.includes("inventorynumber") ||
    joined.includes("inventory_number")
  ) {
    return "Ya existe un equipo con ese número de inventario.";
  }
  if (joined.includes("name") && joined.includes("position")) {
    return "Ya existe un puesto con ese nombre.";
  }
  if (joined.includes("name")) {
    return "Ya existe un registro con ese nombre.";
  }
  return "Registro duplicado: ese valor ya está en uso.";
}

export function handleApiError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return jsonError(prismaUniqueMessage(error), 409);
    }
    if (error.code === "P2025") {
      return jsonError("Registro no encontrado", 404);
    }
  }

  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return jsonError("No autenticado", 401);
    }
    if (error.message === "FORBIDDEN") {
      return jsonError("Sin permisos de administrador", 403);
    }
    return jsonError(error.message, 400);
  }
  return jsonError("Error interno", 500);
}
