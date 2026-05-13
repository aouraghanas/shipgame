"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/components/shared/I18nProvider";

/**
 * Compact numeric pagination bar. Renders:
 *   « Prev | 1 … 4 5 [6] 7 8 … 42 | Next »
 *
 * Used by Activity / Reports / anywhere we render a long server-paginated
 * list. `onChange(page)` is called with a 1-based page index.
 */
export function Pagination({
  page,
  totalPages,
  onChange,
  className,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  className?: string;
}) {
  const t = useT();
  if (totalPages <= 1) return null;

  const windowSize = 2;
  const pages: number[] = [];
  for (let i = Math.max(1, page - windowSize); i <= Math.min(totalPages, page + windowSize); i++) {
    pages.push(i);
  }
  const showFirst = pages[0] > 1;
  const showLast = pages[pages.length - 1] < totalPages;

  return (
    <div
      className={`flex items-center justify-between gap-2 pt-3 border-t border-zinc-800 ${className ?? ""}`}
    >
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" /> {t("pagination.prev")}
      </Button>

      <div className="flex items-center gap-1 flex-wrap justify-center">
        {showFirst && (
          <>
            <PageBtn n={1} current={page} onChange={onChange} />
            {pages[0] > 2 && <span className="px-1 text-zinc-600">…</span>}
          </>
        )}
        {pages.map((n) => (
          <PageBtn key={n} n={n} current={page} onChange={onChange} />
        ))}
        {showLast && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-zinc-600">…</span>}
            <PageBtn n={totalPages} current={page} onChange={onChange} />
          </>
        )}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="gap-1"
      >
        {t("pagination.next")} <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function PageBtn({
  n,
  current,
  onChange,
}: {
  n: number;
  current: number;
  onChange: (p: number) => void;
}) {
  const active = n === current;
  return (
    <button
      type="button"
      onClick={() => onChange(n)}
      className={`h-8 min-w-8 px-2.5 rounded-md text-xs font-medium transition-colors ${
        active
          ? "brand-keep bg-brand text-white"
          : "border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
      }`}
    >
      {n}
    </button>
  );
}
