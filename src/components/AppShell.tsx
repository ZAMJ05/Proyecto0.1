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
const SIDEBAR_WIDTH = 256; // 16rem

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
      {/* Sidebar fijo (desktop) */}
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

      {/* Contenido principal */}
      <div
        className={cn(
          "flex min-h-screen min-w-0 flex-col transition-[margin] duration-200 ease-out",
          ready && open ? "md:ml-64" : "md:ml-0"
        )}
      >
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--header)] px-4 py-3 shadow-[0_1px_0_rgba(15,36,52,0.03)] backdrop-blur-xl md:px-6">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="hidden h-9 w-9 px-0 md:inline-flex"
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
              <div className="md:hidden">
                <p className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                  AssetDesk
                </p>
              </div>
              {!open && (
                <p className="hidden font-[family-name:var(--font-display)] text-lg text-[var(--ink)] md:block">
                  AssetDesk
                </p>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-[var(--ink)]">
                  {user.name}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {user.role === "ADMIN" ? "Administrador" : "Solo lectura"}
                </p>
              </div>
              <span className="rounded-lg bg-[var(--surface-2)] px-2 py-1 text-xs text-[var(--muted)] md:hidden">
                {user.role}
              </span>
              <ThemeToggle />
              <LogoutButton />
            </div>
          </div>
          <TopSearch />
          <nav className="mt-2.5 flex gap-1.5 overflow-x-auto pb-1 md:hidden">
            {[
              ["/dashboard", "Dashboard"],
              ["/activos", "Activos"],
              ["/inventario", "Inventario"],
              ["/stock", "Stock"],
              ["/ciclo-vida", "Ciclo"],
              ["/asignaciones", "Asignaciones"],
              ["/empleados", "Usuarios"],
              ["/puestos", "Puestos"],
              ...(user.role === "ADMIN" ? [["/usuarios", "Accesos"]] : []),
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="whitespace-nowrap rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
              >
                {label}
              </a>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 md:px-6 md:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
