"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { TopSearch } from "@/components/TopSearch";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "assetdesk-sidebar-open";
const SIDEBAR_WIDTH = 248;

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "0") setOpen(false);
    if (saved === "1") setOpen(true);
    setReady(true);
  }, []);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div className="min-h-screen">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden transition-transform duration-200 ease-out md:flex",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ width: SIDEBAR_WIDTH }}
        aria-hidden={!open}
      >
        <Sidebar user={user} onHide={toggle} />
      </aside>

      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-col transition-[margin] duration-200 ease-out",
          ready && open ? "md:ml-[248px]" : "md:ml-0"
        )}
      >
        <header className="sticky top-0 z-30 border-b border-black/10 bg-[var(--header)] text-[var(--header-text)] shadow-[var(--shadow)]">
          <div className="flex items-center justify-between gap-3 px-3 py-2 md:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                className="hidden h-8 w-8 px-0 text-[var(--header-text)] hover:bg-white/10 hover:text-white md:inline-flex"
                onClick={toggle}
                title={open ? "Ocultar menú" : "Mostrar menú"}
                aria-label={open ? "Ocultar menú" : "Mostrar menú"}
              >
                {open ? (
                  <PanelLeftClose className="h-4 w-4" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" />
                )}
              </Button>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold tracking-tight md:hidden">
                  AssetDesk
                </p>
                {!open && (
                  <p className="hidden truncate text-sm font-bold tracking-tight md:block">
                    AssetDesk · Inventario IT
                  </p>
                )}
                {open && (
                  <p className="hidden text-xs text-white/65 md:block">
                    Workspace de inventario
                  </p>
                )}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-[11px] text-white/65">
                  {user.role === "ADMIN" ? "Administrador" : "Solo lectura"}
                </p>
              </div>
              <TopSearch />
              <ThemeToggle />
              <LogoutButton />
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-white/10 px-3 py-1.5 md:hidden">
            {[
              ["/dashboard", "Inicio"],
              ["/equipos", "Laptops"],
              ["/activos", "Activos"],
              ["/inventario", "Inventario"],
              ["/stock", "Stock"],
              ["/asignaciones", "Asignaciones"],
              ["/empleados", "Usuarios"],
              ["/puestos", "Puestos"],
              ...(user.role === "ADMIN" ? [["/usuarios", "Accesos"]] : []),
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="whitespace-nowrap rounded-[var(--radius)] border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-white/80 transition hover:bg-white/12 hover:text-white"
              >
                {label}
              </a>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-[1480px] flex-1 px-3 py-4 md:px-5 md:py-5">
          {children}
        </main>
      </div>
    </div>
  );
}
