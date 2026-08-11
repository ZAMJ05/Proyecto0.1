"use client";

import { LayoutGrid, List, ChevronLeft, ChevronRight, ArrowDownAZ, ArrowUpZA } from "lucide-react";
import { Button, Input, Select } from "./ui";
import type { ListViewMode, SortDir } from "@/hooks/useListControls";
import { LIST_PAGE_SIZE } from "@/hooks/useListControls";
import { cn } from "@/lib/utils";

function pageNumbers(current: number, total: number): number[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= total - 2) {
    pages.add(total - 1);
    pages.add(total - 2);
    pages.add(total - 3);
  }
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
}

export function Pager({
  page,
  totalPages,
  onPageChange,
  showingFrom,
  showingTo,
  total,
  pageSize = LIST_PAGE_SIZE,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showingFrom: number;
  showingTo: number;
  total: number;
  pageSize?: number;
}) {
  const pages = pageNumbers(page, totalPages);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-[var(--muted)]">
        {showingFrom}-{showingTo} de {total} · pág. {page}/{totalPages} ·{" "}
        {pageSize}/página
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          variant="secondary"
          className="px-2 py-1"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>
        {pages.map((p, idx) => {
          const prev = pages[idx - 1];
          const showDots = prev !== undefined && p - prev > 1;
          return (
            <span key={p} className="inline-flex items-center gap-1">
              {showDots && (
                <span className="px-1 text-xs text-[var(--muted)]">…</span>
              )}
              <button
                type="button"
                onClick={() => onPageChange(p)}
                className={cn(
                  "min-w-8 rounded-lg px-2 py-1 text-xs font-semibold transition",
                  p === page
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface-2)] text-[var(--muted)] hover:bg-[var(--border)]"
                )}
              >
                {p}
              </button>
            </span>
          );
        })}
        <Button
          type="button"
          variant="secondary"
          className="px-2 py-1"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ListToolbar({
  name,
  serial,
  onNameChange,
  onSerialChange,
  view,
  onViewChange,
  page,
  totalPages,
  onPageChange,
  showingFrom,
  showingTo,
  total,
  showSerial = true,
  namePlaceholder = "Buscar por nombre...",
  serialPlaceholder = "Buscar por serial...",
  sortOptions,
  sortKey,
  sortDir,
  onSortChange,
}: {
  name: string;
  serial: string;
  onNameChange: (value: string) => void;
  onSerialChange: (value: string) => void;
  view: ListViewMode;
  onViewChange: (view: ListViewMode) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showingFrom: number;
  showingTo: number;
  total: number;
  showSerial?: boolean;
  nameLabel?: string;
  serialLabel?: string;
  namePlaceholder?: string;
  serialPlaceholder?: string;
  sortOptions?: Array<{ key: string; label: string }>;
  sortKey?: string;
  sortDir?: SortDir;
  onSortChange?: (key: string, dir: SortDir) => void;
}) {
  return (
    <div className="mb-3 space-y-2">
      <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:flex-row sm:items-center">
        <div
          className={cn(
            "grid flex-1 gap-2",
            showSerial ? "md:grid-cols-2" : "md:grid-cols-1"
          )}
        >
          <Input
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={namePlaceholder}
            aria-label="Buscar por nombre"
          />
          {showSerial && (
            <Input
              value={serial}
              onChange={(e) => onSerialChange(e.target.value)}
              placeholder={serialPlaceholder}
              aria-label="Buscar por serial"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {sortOptions && sortOptions.length > 0 && onSortChange && (
            <div className="flex items-center gap-1.5">
              <Select
                value={sortKey || sortOptions[0].key}
                onChange={(e) =>
                  onSortChange(e.target.value, sortDir || "asc")
                }
                className="min-w-[9rem] py-1.5 text-xs"
                aria-label="Ordenar por"
                title="Ordenar por"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </Select>
              <Button
                type="button"
                variant="secondary"
                className="px-2 py-1.5"
                title={
                  sortDir === "desc"
                    ? "Mayor → menor / Z → A (clic para invertir)"
                    : "Menor → mayor / A → Z (clic para invertir)"
                }
                onClick={() =>
                  onSortChange(
                    sortKey || sortOptions[0].key,
                    sortDir === "asc" ? "desc" : "asc"
                  )
                }
              >
                {sortDir === "desc" ? (
                  <ArrowUpZA className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownAZ className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          )}

          <div className="flex shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-1">
            <button
              type="button"
              onClick={() => onViewChange("list")}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                view === "list"
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:bg-[var(--surface)]"
              )}
              title="Vista en lista"
            >
              <List className="h-3.5 w-3.5" />
              Lista
            </button>
            <button
              type="button"
              onClick={() => onViewChange("grid")}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                view === "grid"
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:bg-[var(--surface)]"
              )}
              title="Vista en recuadros"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Tarjetas
            </button>
          </div>
        </div>
      </div>

      <Pager
        page={page}
        totalPages={totalPages}
        onPageChange={onPageChange}
        showingFrom={showingFrom}
        showingTo={showingTo}
        total={total}
      />
    </div>
  );
}

/** Paginador inferior para cerrar cada listado */
export function ListFooter(props: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showingFrom: number;
  showingTo: number;
  total: number;
}) {
  if (props.total === 0) return null;
  return (
    <div className="mt-3">
      <Pager {...props} />
    </div>
  );
}
