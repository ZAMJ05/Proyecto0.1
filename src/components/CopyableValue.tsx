"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyableValue({
  value,
  emptyText = "—",
  className,
  label = "Copiar",
}: {
  value?: string | null;
  emptyText?: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = (value || "").trim();

  if (!text) {
    return <span className="text-[var(--muted)]">{emptyText}</span>;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={`${label}: ${text}`}
      className={cn(
        "group inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 font-mono text-xs text-[var(--ink)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]",
        className
      )}
    >
      <span className="truncate select-all">{text}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-[var(--badge-success-fg)]" />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0 text-[var(--muted)] group-hover:text-[var(--accent-strong)]" />
      )}
    </button>
  );
}
