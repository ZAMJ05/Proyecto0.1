"use client";

import { useEffect, useMemo, useState } from "react";
import { matchesSearchQuery } from "@/lib/asset-search";

export type ListViewMode = "grid" | "list";
export type SortDir = "asc" | "desc";
export type SortValue = string | number | null | undefined;
export const LIST_PAGE_SIZE = 50;

export type SortFieldDef<T> = {
  label: string;
  getValue: (item: T) => SortValue;
};

function readView(storageKey: string, fallback: ListViewMode): ListViewMode {
  if (typeof window === "undefined") return fallback;
  const saved = window.localStorage.getItem(`assetdesk-view:${storageKey}`);
  if (saved === "list" || saved === "grid") return saved;
  // En móvil, las tarjetas se leen mejor que una tabla estrecha.
  if (window.matchMedia("(max-width: 639px)").matches) return "grid";
  return fallback;
}

export function compareSortValues(
  a: SortValue,
  b: SortValue,
  dir: SortDir
): number {
  const mul = dir === "asc" ? 1 : -1;
  const emptyA = a == null || a === "";
  const emptyB = b == null || b === "";
  if (emptyA && emptyB) return 0;
  if (emptyA) return 1;
  if (emptyB) return -1;
  if (typeof a === "number" && typeof b === "number") {
    return (a - b) * mul;
  }
  return (
    String(a).localeCompare(String(b), "es", {
      sensitivity: "base",
      numeric: true,
    }) * mul
  );
}

export function useListControls<T>(
  items: T[],
  options: {
    storageKey: string;
    getName: (item: T) => string;
    getSerial?: (item: T) => string;
    /** @deprecated Prefer sortFields + defaultSortKey */
    sortFn?: (a: T, b: T) => number;
    sortFields?: Record<string, SortFieldDef<T>>;
    defaultSortKey?: string;
    defaultSortDir?: SortDir;
    defaultView?: ListViewMode;
    pageSize?: number;
  }
) {
  const pageSize = options.pageSize ?? LIST_PAGE_SIZE;
  const defaultView = options.defaultView ?? "list";
  const sortFields = options.sortFields;
  const defaultSortKey =
    options.defaultSortKey ||
    (sortFields ? Object.keys(sortFields)[0] : undefined);
  const defaultSortDir = options.defaultSortDir ?? "asc";

  const [query, setQuery] = useState("");
  const [view, setViewState] = useState<ListViewMode>(defaultView);
  const [page, setPageState] = useState(1);

  function setPage(next: number) {
    setPageState(next);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  const [sortKey, setSortKey] = useState<string | undefined>(defaultSortKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir);

  useEffect(() => {
    setViewState(readView(options.storageKey, defaultView));
  }, [options.storageKey, defaultView]);

  function setView(next: ListViewMode) {
    setViewState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`assetdesk-view:${options.storageKey}`, next);
    }
  }

  function toggleSort(key: string) {
    if (!sortFields?.[key]) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPageState(1);
  }

  function setSort(key: string, dir?: SortDir) {
    if (!sortFields?.[key]) return;
    setSortKey(key);
    setSortDir(dir ?? "asc");
    setPageState(1);
  }

  const filtered = useMemo(() => {
    const result = items.filter((item) => {
      const blob = `${options.getName(item) || ""} ${options.getSerial?.(item) || ""}`;
      // Una sola barra: nombre, marca, modelo, serie, etc. Todas las palabras deben coincidir.
      return matchesSearchQuery(blob, query);
    });

    if (sortFields && sortKey && sortFields[sortKey]) {
      const getter = sortFields[sortKey].getValue;
      return [...result].sort((a, b) =>
        compareSortValues(getter(a), getter(b), sortDir)
      );
    }

    const sorter =
      options.sortFn ||
      ((a: T, b: T) =>
        options.getName(a).localeCompare(options.getName(b), "es", {
          sensitivity: "base",
        }));

    return [...result].sort(sorter);
  }, [
    items,
    query,
    options.getName,
    options.getSerial,
    options.sortFn,
    sortFields,
    sortKey,
    sortDir,
  ]);

  useEffect(() => {
    setPageState(1);
  }, [query, items]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const sortOptions = sortFields
    ? Object.entries(sortFields).map(([key, def]) => ({
        key,
        label: def.label,
      }))
    : [];

  return {
    query,
    setQuery,
    name: query,
    setName: setQuery,
    view,
    setView,
    page: safePage,
    setPage,
    pageSize,
    filtered,
    pageItems,
    total,
    totalPages,
    showingFrom: total === 0 ? 0 : start + 1,
    showingTo: Math.min(start + pageSize, total),
    sortKey,
    sortDir,
    toggleSort,
    setSort,
    sortOptions,
  };
}
