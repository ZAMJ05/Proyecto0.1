"use client";

import { LayoutGrid, List, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Card, Input, Label } from "./ui";
import type { ListViewMode } from "@/hooks/useListControls";
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
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-[var(--muted)]">
        Grupo {page} de {totalPages} · mostrando {showingFrom}-{showingTo} de{" "}
        {total} · {pageSize} por página
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
          Anterior
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
          Siguiente
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
  nameLabel = "Nombre",
  serialLabel = "Número de serie",
  namePlaceholder = "Buscar por nombre...",
  serialPlaceholder = "Buscar por serial...",
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
}) {
  return (
    <div className="mb-4 space-y-3">
      <Card className="animate-rise">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div
            className={cn(
              "grid flex-1 gap-3",
              showSerial ? "md:grid-cols-2" : "md:grid-cols-1"
            )}
          >
            <div>
              <Label>{nameLabel}</Label>
              <Input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder={namePlaceholder}
              />
            </div>
            {showSerial && (
              <div>
                <Label>{serialLabel}</Label>
                <Input
                  value={serial}
                  onChange={(e) => onSerialChange(e.target.value)}
                  placeholder={serialPlaceholder}
                />
              </div>
            )}
          </div>

          <div className="flex rounded-xl border border-[var(--border)] bg-white p-1">
            <button
              type="button"
              onClick={() => onViewChange("list")}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                view === "list"
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
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
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
              )}
              title="Vista en recuadros"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Recuadros
            </button>
          </div>
        </div>
      </Card>

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
    <div className="mt-4">
      <Pager {...props} />
    </div>
  );
}
