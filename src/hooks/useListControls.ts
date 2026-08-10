"use client";

import { useEffect, useMemo, useState } from "react";

export type ListViewMode = "grid" | "list";
export const LIST_PAGE_SIZE = 25;

function readView(storageKey: string, fallback: ListViewMode): ListViewMode {
  if (typeof window === "undefined") return fallback;
  const saved = window.localStorage.getItem(`assetdesk-view:${storageKey}`);
  return saved === "list" || saved === "grid" ? saved : fallback;
}

export function useListControls<T>(
  items: T[],
  options: {
    storageKey: string;
    getName: (item: T) => string;
    getSerial?: (item: T) => string;
    /** Orden estable antes de paginar */
    sortFn?: (a: T, b: T) => number;
    defaultView?: ListViewMode;
    pageSize?: number;
  }
) {
  const pageSize = options.pageSize ?? LIST_PAGE_SIZE;
  const defaultView = options.defaultView ?? "list";
  const [name, setName] = useState("");
  const [serial, setSerial] = useState("");
  const [view, setViewState] = useState<ListViewMode>(defaultView);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setViewState(readView(options.storageKey, defaultView));
  }, [options.storageKey, defaultView]);

  function setView(next: ListViewMode) {
    setViewState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`assetdesk-view:${options.storageKey}`, next);
    }
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

    const sorter =
      options.sortFn ||
      ((a: T, b: T) =>
        options.getName(a).localeCompare(options.getName(b), "es", {
          sensitivity: "base",
        }));

    return [...result].sort(sorter);
  }, [items, name, serial, options.getName, options.getSerial, options.sortFn]);

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
  };
}
