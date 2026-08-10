"use client";

import { LogOut } from "lucide-react";
import { Button } from "./ui";

export function LogoutButton({
  variant = "header",
}: {
  variant?: "header" | "sidebar";
}) {
  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
    } finally {
      window.location.replace("/login");
    }
  }

  if (variant === "sidebar") {
    return (
      <button
        type="button"
        onClick={logout}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white/90 transition hover:bg-white/16"
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </button>
    );
  }

  return (
    <Button type="button" variant="secondary" onClick={logout} title="Cerrar sesión">
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">Cerrar sesión</span>
    </Button>
  );
}
