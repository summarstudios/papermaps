"use client";

import { useState, useMemo } from "react";

export interface ColumnDef<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AdminTableProps<T extends { id: string }> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  rowKey?: (row: T) => string;
  onRowClick?: (row: T) => void;
  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  defaultLimit?: number;
  className?: string;
}

export function AdminTable<T extends { id: string }>({
  columns,
  data,
  loading = false,
  emptyTitle = "No data",
  emptyDescription,
  rowKey,
  onRowClick,
  pagination,
  onPageChange,
  defaultLimit = 20,
  className = "",
}: AdminTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [clientPage, setClientPage] = useState(1);
  const [clientLimit, setClientLimit] = useState(defaultLimit);

  const isServerPaginated = !!pagination && !!onPageChange;

  const handleSort = (key: string) => {
    if (!isServerPaginated) {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
      setClientPage(1);
    }
  };

  const sorted = useMemo(() => {
    if (sortKey && !isServerPaginated) {
      return [...data].sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortKey];
        const bVal = (b as Record<string, unknown>)[sortKey];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const cmp = String(aVal).localeCompare(String(bVal));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return data;
  }, [data, sortKey, sortDir, isServerPaginated]);

  const paginated = useMemo(() => {
    if (isServerPaginated) return sorted;
    const start = (clientPage - 1) * clientLimit;
    return sorted.slice(start, start + clientLimit);
  }, [sorted, isServerPaginated, clientPage, clientLimit]);

  const totalItems = isServerPaginated ? (pagination?.total ?? 0) : sorted.length;
  const totalPages = isServerPaginated
    ? (pagination?.totalPages ?? 1)
    : Math.ceil(sorted.length / clientLimit);

  const currentPage = isServerPaginated ? (pagination?.page ?? 1) : clientPage;

  const handlePageChange = (page: number) => {
    if (isServerPaginated) {
      onPageChange?.(page);
    } else {
      setClientPage(page);
    }
  };

  const handleLimitChange = (limit: number) => {
    setClientLimit(limit);
    setClientPage(1);
  };

  const getKey = (row: T, index: number) =>
    rowKey ? rowKey(row) : row.id ?? index;

  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className={`rounded-lg border border-gray-800 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/50 border-b border-gray-800">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  className={`px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider ${
                    col.sortable ? "cursor-pointer select-none hover:text-gray-300" : ""
                  }`}
                  style={{ width: col.width }}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span className="text-accent">{sortDir === "asc" ? "↑" : "↓"}</span>
                    )}
                    {col.sortable && sortKey !== col.key && (
                      <span className="text-gray-600">↕</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-3">
                      <div className="h-4 bg-gray-700/40 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-12 text-center text-[13px] text-gray-500"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg">📭</span>
                    <span className="font-medium text-gray-300">{emptyTitle}</span>
                    {emptyDescription && (
                      <span>{emptyDescription}</span>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((row, index) => (
                <tr
                  key={getKey(row, index)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`transition-colors ${
                    onRowClick ? "cursor-pointer hover:bg-gray-800/30" : "hover:bg-gray-800/30"
                  }`}
                >
                  {columns.map((col) => {
                    const value = (row as Record<string, unknown>)[col.key];
                    return (
                      <td key={col.key} className="px-3 py-2">
                        {col.render
                          ? col.render(value, row, index)
                          : value != null
                          ? String(value)
                          : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800 gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Show</span>
            <select
              value={isServerPaginated ? pagination!.limit : clientLimit}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              className="h-7 w-[70px] rounded border border-gray-700 bg-gray-900 px-1.5 text-[13px] text-gray-300 focus:border-gray-500 focus:outline-none"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span>of {totalItems}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-7 min-w-[60px] px-2 rounded text-[13px] bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>

            {pageNumbers.map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1 text-gray-500 text-sm">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => handlePageChange(p as number)}
                  className={`h-7 min-w-[28px] px-1.5 rounded text-[13px] transition-colors ${
                    p === currentPage
                      ? "bg-accent text-black font-medium"
                      : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-7 min-w-[60px] px-2 rounded text-[13px] bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Shared action button helpers for use in render functions

export function EditButton({
  onClick,
  children,
}: {
  onClick: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="h-7 px-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 text-[13px] transition-colors"
    >
      {children ?? "Edit"}
    </button>
  );
}

export function DeleteButton({
  onClick,
  children,
}: {
  onClick: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="h-7 px-2 rounded-md text-red-400/60 hover:text-red-400 hover:bg-red-500/10 text-[13px] transition-colors"
    >
      {children ?? "Delete"}
    </button>
  );
}

export function ColorSwatch({
  color,
  type = "square",
}: {
  color: string;
  type?: "square" | "circle";
}) {
  return (
    <span
      className={`inline-block ${type === "circle" ? "rounded-full" : "rounded-sm"}`}
      style={{
        backgroundColor: color,
        width: 12,
        height: 12,
      }}
    />
  );
}
