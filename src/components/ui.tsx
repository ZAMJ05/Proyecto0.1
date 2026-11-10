"use client";

import { cn } from "@/lib/utils";
import {
  ReactNode,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function Card({
  children,
  className,
  onClick,
  id,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  id?: string;
}) {
  return (
    <div
      id={id}
      onClick={onClick}
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-[var(--shadow)] sm:p-4 lg:p-5",
        onClick &&
          "cursor-pointer transition duration-150 hover:border-[var(--accent)] hover:bg-[var(--row-hover)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
}) {
  const variants = {
    primary:
      "bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)] active:opacity-95",
    secondary:
      "bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] hover:bg-[var(--surface-2)] hover:border-[var(--border-strong)]",
    danger: "bg-[var(--danger)] text-white hover:opacity-90",
    ghost:
      "bg-transparent text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] px-3 py-1.5 text-sm font-semibold transition duration-120 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

const fieldClass =
  "w-full min-h-10 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[15px] text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--ring)]";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldClass, "pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(fieldClass, "min-h-[4.5rem] resize-y", className)}
      {...props}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.04em] text-[var(--muted)]">
      {children}
    </label>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warn" | "danger" | "info";
}) {
  const tones = {
    neutral: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]",
    success: "bg-[var(--badge-success-bg)] text-[var(--badge-success-fg)]",
    warn: "bg-[var(--badge-warn-bg)] text-[var(--badge-warn-fg)]",
    danger: "bg-[var(--badge-danger-bg)] text-[var(--badge-danger-fg)]",
    info: "bg-[var(--badge-info-bg)] text-[var(--badge-info-fg)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[0.25rem] px-1.5 py-0.5 text-xs font-bold tracking-wide",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  module = "Inventario IT",
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  module?: string;
}) {
  return (
    <div className="sn-module-header animate-fade">
      <div>
        <p className="sn-breadcrumb">{module}</p>
        <h1 className="sn-title">{title}</h1>
        {subtitle && <p className="sn-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-6 py-10 text-center">
      <p className="text-sm text-[var(--muted)]">{text}</p>
    </div>
  );
}

export function statusTone(status: string) {
  switch (status) {
    case "Activo":
      return "success" as const;
    case "Stock":
      return "info" as const;
    case "Reparacion":
      return "warn" as const;
    case "Inactivo":
    case "Baja":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}
