"use client";

import { LayoutGrid, List, ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Card, Input, Label } from "./ui";
import type { ListViewMode } from "@/hooks/useListControls";
import { cn } from "@/lib/utils";

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
    <Card className="mb-4 animate-rise">
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

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-[var(--border)] bg-white p-1">
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
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[var(--muted)]">
          Mostrando {showingFrom}-{showingTo} de {total} · 25 por página
        </p>
        <div className="flex items-center gap-2">
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
          <span className="min-w-20 text-center text-xs text-[var(--muted)]">
            Página {page} / {totalPages}
          </span>
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
    </Card>
  );
}
