import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { TopSearch } from "@/components/TopSearch";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:flex">
        <Sidebar user={session} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--header)] px-4 py-3 backdrop-blur md:px-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="md:hidden">
              <p className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
                AssetDesk
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-[var(--ink)]">
                  {session.name}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {session.role === "ADMIN" ? "Administrador" : "Solo lectura"}
                </p>
              </div>
              <span className="rounded-lg bg-[var(--surface-2)] px-2 py-1 text-xs text-[var(--muted)] md:hidden">
                {session.role}
              </span>
              <ThemeToggle />
              <LogoutButton />
            </div>
          </div>
          <TopSearch />
          <nav className="mt-2 flex gap-2 overflow-x-auto pb-1 md:hidden">
            {[
              ["/dashboard", "Dashboard"],
              ["/inventario", "Inventario"],
              ["/stock", "Stock"],
              ["/ciclo-vida", "Ciclo"],
              ["/asignaciones", "Asignaciones"],
              ["/empleados", "Usuarios"],
              ["/puestos", "Puestos"],
              ...(session.role === "ADMIN" ? [["/usuarios", "Accesos"]] : []),
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="whitespace-nowrap rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--muted)]"
              >
                {label}
              </a>
            ))}
          </nav>
        </header>
        <main className="flex-1 px-4 py-5 md:px-6">{children}</main>
      </div>
    </div>
  );
}
