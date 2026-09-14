"use client";

import { Eye } from "lucide-react";
import { useEffect, useState } from "react";
import { isNewVisit, VISIT_COUNTED_KEY } from "@/lib/visitors";

/** Visits so far, counted once a day per browser; hidden until the count can be read. */
export function VisitorCounter() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    const today = new Date().toISOString().slice(0, 10);
    let last: string | null = null;
    try {
      last = window.localStorage.getItem(VISIT_COUNTED_KEY);
    } catch {}
    const counting = isNewVisit(last, today);
    fetch("/api/visitors", { method: counting ? "POST" : "GET", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { count: null }))
      .then(({ count }: { count: number | null }) => {
        if (!active || typeof count !== "number") return;
        setCount(count);
        if (counting) {
          try {
            window.localStorage.setItem(VISIT_COUNTED_KEY, today);
          } catch {}
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  if (count === null) return null;
  // A list item of the header nav, so nothing (not even an empty item) shows until there's a count.
  return (
    <li className="flex items-center gap-1.5" title="Visits, each browser counted once a day">
      <Eye aria-hidden className="size-3.5" />
      Visitors <span className="text-ink tabular-nums">{count.toLocaleString("en")}</span>
    </li>
  );
}
