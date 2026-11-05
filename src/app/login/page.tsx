"use client";

import { FormEvent, useState } from "react";
import { Laptop } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error de acceso");
      setEmail("");
      setPassword("");
      window.location.replace("/dashboard");
      return;
    } catch (err) {
      setPassword("");
      setError(err instanceof Error ? err.message : "Error de acceso");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4 z-20 [&_button]:border-[var(--border)] [&_button]:bg-[var(--surface)] [&_button]:text-[var(--ink)] [&_button]:hover:bg-[var(--surface-2)] [&_button]:hover:text-[var(--ink)]">
        <ThemeToggle />
      </div>

      <div className="animate-rise relative grid w-full max-w-4xl overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] lg:grid-cols-[1fr_1fr]">
        <section className="relative hidden bg-[var(--sidebar)] p-9 text-white lg:block">
          <div className="absolute inset-x-0 top-0 h-1 bg-[var(--accent)]" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-[var(--radius)] bg-[var(--accent)]">
                <Laptop className="h-5 w-5" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/55">
                Workspace
              </p>
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl leading-tight tracking-tight">
                AssetDesk
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
                Inventario IT al estilo de un workspace corporativo: laptops,
                monitores, stock, asignaciones y usuarios activos.
              </p>
              <ul className="mt-6 space-y-2 text-sm text-white/65">
                <li>· Consulta rápida de laptops y monitores</li>
                <li>· Stock listo para asignar</li>
                <li>· Nombres completos y usuarios sin duplicados</li>
              </ul>
            </div>
            <p className="text-xs text-white/50">
              Acceso restringido a cuentas creadas en Accesos app.
            </p>
          </div>
        </section>

        <section className="p-7 sm:p-9">
          <div className="mb-6 lg:hidden">
            <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
              AssetDesk
            </p>
            <p className="text-sm text-[var(--muted)]">Inventario IT</p>
          </div>
          <p className="sn-breadcrumb">Inicio de sesión</p>
          <h2 className="sn-title">Entrar al workspace</h2>
          <p className="sn-subtitle">
            Usa la cuenta que te asignó el administrador. La sesión no se guarda
            automáticamente.
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-7 space-y-4"
            autoComplete="off"
            method="post"
          >
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                name="email"
                required
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@empresa.com"
              />
            </div>
            <div>
              <Label>Contraseña</Label>
              <Input
                type="password"
                name="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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
