"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortDir } from "@/hooks/useListControls";

export function SortableTh({
  label,
  columnKey,
  activeKey,
  direction,
  onSort,
  className,
  align = "left",
}: {
  label: string;
  columnKey: string;
  activeKey?: string;
  direction?: SortDir;
  onSort: (key: string) => void;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  const active = activeKey === columnKey;
  const Icon = !active ? ArrowUpDown : direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <th
      className={cn(
        "px-4 py-3 text-xs font-semibold uppercase tracking-wide",
        align === "left" && "text-left",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-1 py-0.5 transition hover:text-[var(--ink)]",
          active ? "text-[var(--ink)]" : "text-[var(--muted)]"
        )}
        title={
          active
            ? direction === "asc"
              ? "Orden ascendente (clic para invertir)"
              : "Orden descendente (clic para invertir)"
            : `Ordenar por ${label}`
        }
      >
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
      </button>
    </th>
  );
}
