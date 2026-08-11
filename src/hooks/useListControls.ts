"use client";

import { useEffect, useMemo, useState } from "react";

export type ListViewMode = "grid" | "list";
export type SortDir = "asc" | "desc";
export type SortValue = string | number | null | undefined;
export const LIST_PAGE_SIZE = 25;

export type SortFieldDef<T> = {
  label: string;
  getValue: (item: T) => SortValue;
};

function readView(storageKey: string, fallback: ListViewMode): ListViewMode {
  if (typeof window === "undefined") return fallback;
  const saved = window.localStorage.getItem(`assetdesk-view:${storageKey}`);
  return saved === "list" || saved === "grid" ? saved : fallback;
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

  const [name, setName] = useState("");
  const [serial, setSerial] = useState("");
  const [view, setViewState] = useState<ListViewMode>(defaultView);
  const [page, setPage] = useState(1);
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
    setPage(1);
  }

  function setSort(key: string, dir?: SortDir) {
    if (!sortFields?.[key]) return;
    setSortKey(key);
    setSortDir(dir ?? "asc");
    setPage(1);
  }

  const filtered = useMemo(() => {
    const n = name.trim().toLowerCase();
    const s = serial.trim().toLowerCase();
    const result = items.filter((item) => {
      const itemName = (options.getName(item) || "").toLowerCase();
      const itemSerial = (options.getSerial?.(item) || "").toLowerCase();
      const matchName = !n || itemName.includes(n);
      const matchSerial = !s || itemSerial.includes(s);
      return matchName && matchSerial;
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
    name,
    serial,
    options.getName,
    options.getSerial,
    options.sortFn,
    sortFields,
    sortKey,
    sortDir,
  ]);

  useEffect(() => {
    setPage(1);
  }, [name, serial, items]);

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
    name,
    setName,
    serial,
    setSerial,
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
