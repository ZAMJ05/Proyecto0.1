"use client";

import { LogOut } from "lucide-react";
import { Button } from "./ui";

export function LogoutButton({
  variant = "header",
}: {
  variant?: "header" | "sidebar";
}) {
  const className =
    variant === "sidebar"
      ? "flex w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-white/10 px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/16"
      : undefined;

  // Formulario nativo: el navegador aplica Set-Cookie del redirect de forma fiable
  if (variant === "sidebar") {
    return (
      <form action="/api/auth/logout" method="post" className="w-full">
        <button type="submit" className={className}>
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </form>
    );
  }

  return (
    <form action="/api/auth/logout" method="post">
      <Button
        type="submit"
        variant="secondary"
        title="Cerrar sesión"
        className="h-8 border-white/15 bg-white/8 px-2 text-[var(--header-text)] hover:border-white/25 hover:bg-white/14 hover:text-white"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Salir</span>
      </Button>
    </form>
  );
}
