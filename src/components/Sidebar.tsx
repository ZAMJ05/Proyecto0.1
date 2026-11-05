"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  ClipboardList,
  Laptop,
  LayoutDashboard,
  MonitorCheck,
  Package,
  PanelLeftClose,
  RefreshCw,
  UserCog,
  Users,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";

const groups = [
  {
    label: "Inicio",
    items: [{ href: "/dashboard", label: "Inicio", icon: LayoutDashboard }],
  },
  {
    label: "Consulta",
    items: [
      { href: "/equipos", label: "Laptops y monitores", icon: Laptop },
      { href: "/activos", label: "Equipos activos", icon: MonitorCheck },
      { href: "/inventario", label: "Inventario completo", icon: Package },
      { href: "/stock", label: "Stock / Reserva", icon: Warehouse },
    ],
  },
  {
    label: "Operación",
    items: [
      { href: "/asignaciones", label: "Asignaciones", icon: ClipboardList },
      { href: "/ciclo-vida", label: "Ciclo de vida", icon: RefreshCw },
      { href: "/empleados", label: "Usuarios-Activos", icon: Users },
      { href: "/puestos", label: "Puestos", icon: Briefcase },
    ],
  },
];

export function Sidebar({
  user,
  onHide,
}: {
  user: SessionUser;
  onHide?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full flex-col border-r border-white/10 bg-[var(--sidebar)] text-[var(--sidebar-text)]">
      <div className="border-b border-white/10 px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] bg-[var(--accent)]">
            <Laptop className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold tracking-tight">AssetDesk</p>
            <p className="truncate text-[11px] text-[var(--sidebar-muted)]">
              Inventario IT
            </p>
          </div>
          {onHide && (
            <button
              type="button"
              onClick={onHide}
              className="rounded-[var(--radius)] p-1.5 text-[var(--sidebar-muted)] transition hover:bg-white/10 hover:text-white"
              title="Ocultar menú"
              aria-label="Ocultar menú"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--sidebar-muted)]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((link) => {
                const active = pathname.startsWith(link.href);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-[var(--radius)] px-2.5 py-2 text-[13px] transition",
                      active
                        ? "bg-white/12 text-white"
                        : "text-[var(--sidebar-muted)] hover:bg-white/8 hover:text-white"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--accent)]" />
                    )}
                    <Icon className="h-4 w-4 shrink-0 opacity-90" />
                    <span className="font-semibold">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        {user.role === "ADMIN" && (
          <div>
            <p className="mb-1 px-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--sidebar-muted)]">
              Administración
            </p>
            <Link
              href="/usuarios"
              className={cn(
                "group relative flex items-center gap-2.5 rounded-[var(--radius)] px-2.5 py-2 text-[13px] transition",
                pathname.startsWith("/usuarios")
                  ? "bg-white/12 text-white"
                  : "text-[var(--sidebar-muted)] hover:bg-white/8 hover:text-white"
              )}
            >
              {pathname.startsWith("/usuarios") && (
                <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--accent)]" />
              )}
              <UserCog className="h-4 w-4 shrink-0 opacity-90" />
              <span className="font-semibold">Accesos app</span>
            </Link>
          </div>
        )}
      </nav>

      <div className="border-t border-white/10 p-2.5">
        <div className="mb-2 rounded-[var(--radius)] bg-white/8 px-2.5 py-2">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-[11px] text-[var(--sidebar-muted)]">
            {user.email}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-sky-200/90">
            {user.role === "ADMIN" ? "Administrador" : "Solo lectura"}
          </p>
        </div>
        <LogoutButton variant="sidebar" />
      </div>
    </div>
  );
}
