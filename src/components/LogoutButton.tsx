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
      ? "flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white/90 transition hover:bg-white/16"
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
      <Button type="submit" variant="secondary" title="Cerrar sesión">
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Cerrar sesión</span>
      </Button>
    </form>
  );
}
