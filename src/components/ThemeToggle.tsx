"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "./ui";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={toggleTheme}
      title={isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      aria-label={isDark ? "Tema claro" : "Tema oscuro"}
      className="h-8 border-white/15 bg-white/8 px-2 text-[var(--header-text)] hover:border-white/25 hover:bg-white/14 hover:text-white"
    >
      {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{isDark ? "Claro" : "Oscuro"}</span>
    </Button>
  );
}
