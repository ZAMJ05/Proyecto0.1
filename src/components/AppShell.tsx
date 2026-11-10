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
/** Debajo de esto (media pantalla / tablet) el menú lateral se oculta. */
const SIDEBAR_BREAKPOINT = 1280;

export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${SIDEBAR_BREAKPOINT}px)`);
    const syncWide = () => setWide(mq.matches);

    syncWide();
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "0") setOpen(false);
    else if (saved === "1") setOpen(mq.matches);
    else setOpen(mq.matches);

    const onChange = () => {
      syncWide();
      if (!mq.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    setReady(true);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  const showDesktopSidebar = ready && wide && open;

  const navLinks = [
    ["/dashboard", "Inicio"],
    ["/equipos", "Laptops"],
    ["/activos", "Activos"],
    ["/inventario", "Inventario"],
    ["/stock", "Stock"],
    ["/tablero", "Tablero"],
    ["/asignaciones", "Asignaciones"],
    ["/empleados", "Usuarios"],
    ["/puestos", "Puestos"],
    ...(user.role === "ADMIN" ? [["/usuarios", "Accesos"] as const] : []),
  ] as const;

  return (
    <div className="min-h-screen">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden transition-transform duration-200 ease-out xl:flex",
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
          showDesktopSidebar ? "xl:ml-[248px]" : "xl:ml-0"
        )}
      >
        <header className="sticky top-0 z-30 border-b border-black/10 bg-[var(--header)] text-[var(--header-text)] shadow-[var(--shadow)]">
          <div className="flex items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                className="hidden h-9 w-9 px-0 text-[var(--header-text)] hover:bg-white/10 hover:text-white xl:inline-flex"
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
                <p className="truncate text-[15px] font-bold tracking-tight xl:hidden">
                  AssetDesk
                </p>
                {!open && (
                  <p className="hidden truncate text-sm font-bold tracking-tight xl:block">
                    AssetDesk · Inventario IT
                  </p>
                )}
                {open && (
                  <p className="hidden text-xs text-white/65 xl:block">
                    Workspace de inventario
                  </p>
                )}
              </div>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
              <div className="mr-1 hidden text-right md:block">
                <p className="text-sm font-semibold leading-tight">{user.name}</p>
                <p className="text-[11px] leading-tight text-white/65">
                  {user.role === "ADMIN" ? "Administrador" : "Solo lectura"}
                </p>
              </div>
              <TopSearch />
              <ThemeToggle />
              <LogoutButton />
            </div>
          </div>
          <nav
            className="flex gap-1.5 overflow-x-auto border-t border-white/10 px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] xl:hidden [&::-webkit-scrollbar]:hidden"
            aria-label="Secciones"
          >
            {navLinks.map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="shrink-0 whitespace-nowrap rounded-[var(--radius)] border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/85 transition hover:bg-white/12 hover:text-white"
              >
                {label}
              </a>
            ))}
          </nav>
        </header>
        <main className="app-main mx-auto w-full max-w-[1480px] flex-1 px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
          {children}
        </main>
      </div>
    </div>
  );
}
