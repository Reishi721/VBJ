import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";

interface PaginationProps {
  page: number;           // 0-indexed current page
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export function Pagination({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
  if (pageCount <= 1 && total <= pageSizeOptions[0]) return null;

  const from = page * pageSize + 1;
  const to   = Math.min((page + 1) * pageSize, total);

  return (
    <div className="px-5 py-3.5 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/30">
      <div className="flex items-center gap-3 text-[12px] text-gray-500">
        <span>
          Menampilkan{" "}
          <span className="font-semibold text-gray-800">{from}–{to}</span>{" "}
          dari{" "}
          <span className="font-semibold text-gray-800">{total}</span> data
        </span>
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(0); }}
            className="ml-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-[12px] font-semibold text-gray-700 focus:outline-none focus:border-blue-400 cursor-pointer"
          >
            {pageSizeOptions.map(s => (
              <option key={s} value={s}>{s} / halaman</option>
            ))}
          </select>
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <NavBtn onClick={() => onPageChange(0)} disabled={page === 0} title="Halaman pertama">
            <ChevronsLeft className="w-4 h-4" />
          </NavBtn>
          <NavBtn onClick={() => onPageChange(page - 1)} disabled={page === 0} title="Sebelumnya">
            <ChevronLeft className="w-4 h-4" />
          </NavBtn>

          {/* Page number buttons */}
          {buildPageNumbers(page, pageCount).map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-[12px]">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`w-8 h-8 rounded-lg text-[12px] font-semibold transition-all ${
                  p === page
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                    : "border border-gray-200 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {(p as number) + 1}
              </button>
            )
          )}

          <NavBtn onClick={() => onPageChange(page + 1)} disabled={page >= pageCount - 1} title="Selanjutnya">
            <ChevronRight className="w-4 h-4" />
          </NavBtn>
          <NavBtn onClick={() => onPageChange(pageCount - 1)} disabled={page >= pageCount - 1} title="Halaman terakhir">
            <ChevronsRight className="w-4 h-4" />
          </NavBtn>
        </div>
      )}
    </div>
  );
}

function NavBtn({ onClick, disabled, title, children }: {
  onClick: () => void; disabled: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
    >
      {children}
    </button>
  );
}

function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages: (number | "…")[] = [];
  if (current <= 3) {
    pages.push(0, 1, 2, 3, 4, "…", total - 1);
  } else if (current >= total - 4) {
    pages.push(0, "…", total - 5, total - 4, total - 3, total - 2, total - 1);
  } else {
    pages.push(0, "…", current - 1, current, current + 1, "…", total - 1);
  }
  return pages;
}

/** Simple hook for manual pagination */
export function usePagination(total: number, defaultPageSize = 10) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  // Clamp page when data shrinks
  const safePage = Math.min(page, pageCount - 1);

  const paginate = <T,>(data: T[]): T[] =>
    data.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(0);
  };

  return {
    page: safePage,
    pageSize,
    pageCount,
    setPage,
    setPageSize: handlePageSizeChange,
    paginate,
  };
}

// Need useState for the hook
import { useState } from "react";
