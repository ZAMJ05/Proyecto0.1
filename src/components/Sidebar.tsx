"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  RefreshCw,
  Users,
  Briefcase,
  UserCog,
  MonitorSmartphone,
  ClipboardList,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";
import { LogoutButton } from "./LogoutButton";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventario", label: "Inventario", icon: Package },
  { href: "/stock", label: "Stock / Reserva", icon: Warehouse },
  { href: "/ciclo-vida", label: "Ciclo de vida", icon: RefreshCw },
  { href: "/asignaciones", label: "Asignaciones", icon: ClipboardList },
  { href: "/empleados", label: "Usuarios-Activos", icon: Users },
  { href: "/puestos", label: "Puestos", icon: Briefcase },
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
    <div className="flex h-full w-full flex-col border-r border-[var(--border)] bg-[var(--sidebar)] text-[var(--sidebar-text)]">
      <div className="border-b border-white/10 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]">
            <MonitorSmartphone className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-[family-name:var(--font-display)] text-lg leading-none tracking-tight">
              AssetDesk
            </p>
            <p className="mt-1 text-xs text-white/55">Inventario IT</p>
          </div>
          {onHide && (
            <button
              type="button"
              onClick={onHide}
              className="rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              title="Ocultar menú"
              aria-label="Ocultar menú"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                active
                  ? "bg-white/12 text-white"
                  : "text-white/65 hover:bg-white/8 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          );
        })}
        {user.role === "ADMIN" && (
          <Link
            href="/usuarios"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
              pathname.startsWith("/usuarios")
                ? "bg-white/12 text-white"
                : "text-white/65 hover:bg-white/8 hover:text-white"
            )}
          >
            <UserCog className="h-4 w-4 shrink-0" />
            Accesos app
          </Link>
        )}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="mb-2 rounded-xl bg-white/8 px-3 py-2.5">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-white/55">{user.email}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-teal-200/90">
            {user.role === "ADMIN" ? "Administrador" : "Solo lectura"}
          </p>
        </div>
        <LogoutButton variant="sidebar" />
      </div>
    </div>
  );
}
