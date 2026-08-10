"use client";

import { FormEvent, useState } from "react";
import { MonitorSmartphone } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@inventario.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error de acceso");
      // Navegación completa para que el navegador envíe la cookie de sesión
      window.location.assign("/dashboard");
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de acceso");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute inset-0 overflow-hidden">
        <div className="animate-pulse-soft absolute -left-20 top-10 h-72 w-72 rounded-full bg-teal-500/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="animate-rise relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[var(--border)] bg-white shadow-[0_30px_80px_rgba(16,36,51,0.12)] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden bg-[var(--sidebar)] p-10 text-white lg:block">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(135deg, rgba(15,118,110,0.55), transparent 50%), radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18), transparent 35%)",
            }}
          />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)]">
                <MonitorSmartphone className="h-7 w-7" />
              </div>
              <h1 className="font-[family-name:var(--font-display)] text-5xl leading-tight tracking-tight">
                AssetDesk
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75">
                Control centralizado de inventario IT: activos, stock,
                renovaciones cada 4 años y mantenimiento cada 6 meses.
              </p>
            </div>
            <div className="space-y-2 text-sm text-white/70">
              <p>Admin: admin@inventario.local / admin123</p>
              <p>Consulta: consulta@inventario.local / user123</p>
            </div>
          </div>
        </section>

        <section className="p-8 sm:p-10">
          <div className="mb-8 lg:hidden">
            <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
              AssetDesk
            </p>
            <p className="text-sm text-[var(--muted)]">Inventario IT</p>
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
            Iniciar sesión
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Accede para consultar o administrar el inventario.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Contraseña</Label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
