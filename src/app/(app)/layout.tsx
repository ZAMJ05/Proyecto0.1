import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { TopSearch } from "@/components/TopSearch";

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
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-white/85 px-4 py-4 backdrop-blur md:px-8">
          <div className="mb-3 flex items-center justify-between md:hidden">
            <p className="font-[family-name:var(--font-display)] text-xl">
              AssetDesk
            </p>
            <span className="rounded-lg bg-[var(--surface-2)] px-2 py-1 text-xs text-[var(--muted)]">
              {session.role}
            </span>
          </div>
          <TopSearch />
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
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
                className="whitespace-nowrap rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs text-[var(--muted)]"
              >
                {label}
              </a>
            ))}
          </nav>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
