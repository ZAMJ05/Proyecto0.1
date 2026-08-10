"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  RefreshCw,
  Users,
  Briefcase,
  UserCog,
  LogOut,
  MonitorSmartphone,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventario", label: "Inventario", icon: Package },
  { href: "/stock", label: "Stock / Reserva", icon: Warehouse },
  { href: "/ciclo-vida", label: "Ciclo de vida", icon: RefreshCw },
  { href: "/asignaciones", label: "Asignaciones", icon: ClipboardList },
  { href: "/empleados", label: "Usuarios-Activos", icon: Users },
  { href: "/puestos", label: "Puestos", icon: Briefcase },
];

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] text-white">
      <div className="border-b border-white/10 px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)] shadow-lg shadow-teal-900/30">
            <MonitorSmartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="font-[family-name:var(--font-display)] text-xl leading-none tracking-tight">
              AssetDesk
            </p>
            <p className="mt-1 text-xs text-white/60">Inventario IT</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => {
          const active = pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                active
                  ? "bg-white/12 text-white"
                  : "text-white/70 hover:bg-white/8 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
        {user.role === "ADMIN" && (
          <Link
            href="/usuarios"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
              pathname.startsWith("/usuarios")
                ? "bg-white/12 text-white"
                : "text-white/70 hover:bg-white/8 hover:text-white"
            )}
          >
            <UserCog className="h-4 w-4" />
            Accesos app
          </Link>
        )}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 rounded-xl bg-white/8 px-3 py-3">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-white/60">{user.email}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-teal-200">
            {user.role === "ADMIN" ? "Administrador" : "Solo lectura"}
          </p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white/90 transition hover:bg-white/16"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
