"use client";

import { useEffect, useMemo, useState } from "react";

export type ListViewMode = "grid" | "list";

const PAGE_SIZE = 25;

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
    defaultView?: ListViewMode;
    pageSize?: number;
  }
) {
  const pageSize = options.pageSize ?? PAGE_SIZE;
  const [name, setName] = useState("");
  const [serial, setSerial] = useState("");
  const [view, setViewState] = useState<ListViewMode>(
    options.defaultView ?? "grid"
  );
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setViewState(readView(options.storageKey, options.defaultView ?? "grid"));
    setReady(true);
  }, [options.storageKey, options.defaultView]);

  function setView(next: ListViewMode) {
    setViewState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`assetdesk-view:${options.storageKey}`, next);
    }
  }

  const filtered = useMemo(() => {
    const n = name.trim().toLowerCase();
    const s = serial.trim().toLowerCase();
    return items.filter((item) => {
      const itemName = (options.getName(item) || "").toLowerCase();
      const itemSerial = (options.getSerial?.(item) || "").toLowerCase();
      const matchName = !n || itemName.includes(n);
      const matchSerial = !s || itemSerial.includes(s);
      return matchName && matchSerial;
    });
  }, [items, name, serial, options]);

  useEffect(() => {
    setPage(1);
  }, [name, serial, items.length]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
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
    ready,
    showingFrom: total === 0 ? 0 : start + 1,
    showingTo: Math.min(start + pageSize, total),
  };
}
