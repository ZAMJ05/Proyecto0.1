"use client";

import { FormEvent, useEffect, useState } from "react";
import { Laptop } from "lucide-react";
import { Button, Input, Label } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";

const REMEMBER_KEY = "assetdesk-remember-login";

type RememberedLogin = {
  email: string;
  password: string;
};

function readRemembered(): RememberedLogin | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RememberedLogin>;
    const email = String(parsed.email || "").trim();
    const password = String(parsed.password || "");
    if (!email) return null;
    return { email, password };
  } catch {
    return null;
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = readRemembered();
    if (saved) {
      setEmail(saved.email);
      setPassword(saved.password);
      setRemember(true);
    }
    setReady(true);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const nextEmail = email.trim().toLowerCase();
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: nextEmail,
          password,
        }),
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error de acceso");

      try {
        if (remember) {
          localStorage.setItem(
            REMEMBER_KEY,
            JSON.stringify({ email: nextEmail, password })
          );
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }
      } catch {
        // Si el navegador bloquea localStorage, igual se permite el acceso.
      }

      // No vaciar los campos antes de redirigir: así el navegador
      // también puede ofrecer guardar las credenciales.
      window.location.replace("/dashboard");
      return;
    } catch (err) {
      setPassword("");
      if (!remember) {
        try {
          localStorage.removeItem(REMEMBER_KEY);
        } catch {
          // ignore
        }
      }
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
            Usa la cuenta que te asignó el administrador. Puedes recordar
            usuario y contraseña en este equipo.
          </p>

          <form
            onSubmit={onSubmit}
            className="mt-7 space-y-4"
            autoComplete="on"
            method="post"
          >
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                name="username"
                required
                autoComplete="username"
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-[var(--ink)]">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                checked={remember}
                disabled={!ready}
                onChange={(e) => {
                  const next = e.target.checked;
                  setRemember(next);
                  if (!next) {
                    try {
                      localStorage.removeItem(REMEMBER_KEY);
                    } catch {
                      // ignore
                    }
                  }
                }}
              />
              <span>
                Recordar usuario y contraseña en este equipo
                <span className="mt-0.5 block text-xs text-[var(--muted)]">
                  Se guardan solo en este navegador. Desmárcalo en equipos
                  compartidos.
                </span>
              </span>
            </label>
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
