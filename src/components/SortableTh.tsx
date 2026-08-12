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
          "inline-flex max-w-full items-center gap-1.5 rounded-lg px-1.5 py-1 transition",
          active
            ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
            : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--ink)]"
        )}
        title={
          active
            ? direction === "asc"
              ? "Orden ascendente (clic para invertir)"
              : "Orden descendente (clic para invertir)"
            : `Ordenar por ${label}`
        }
      >
        <span className="truncate">{label}</span>
        <Icon
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            active ? "opacity-100" : "opacity-55"
          )}
        />
      </button>
    </th>
  );
}
