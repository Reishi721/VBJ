import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  getSortedRowModel,
} from "@tanstack/react-table";
import type { SortingState, ColumnDef } from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "../../lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pagination?: boolean;
  className?: string;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pagination = true,
  className,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  return (
    <div className={cn("rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden flex flex-col", className)}>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-gray-50/80 border-b border-gray-100">
                {headerGroup.headers.map((header) => {
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "px-5 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider",
                        header.column.getCanSort() ? "cursor-pointer select-none hover:bg-gray-100/50 transition-colors" : ""
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1.5">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {header.column.getCanSort() && (
                          <div className="flex flex-col">
                            <ChevronUp className={cn("w-2.5 h-2.5 -mb-1", header.column.getIsSorted() === "asc" ? "text-blue-500" : "text-gray-300")} />
                            <ChevronDown className={cn("w-2.5 h-2.5", header.column.getIsSorted() === "desc" ? "text-blue-500" : "text-gray-300")} />
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-50">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn(
                    "hover:bg-gray-50/50 transition-colors group",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-5 py-16 text-center text-gray-400 text-sm">
                  Tidak ada data ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && table.getPageCount() > 1 && (
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
          <div className="text-[12px] font-medium text-gray-500">
            Menampilkan <span className="text-gray-900">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span> hingga{" "}
            <span className="text-gray-900">
              {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, data.length)}
            </span>{" "}
            dari <span className="text-gray-900">{data.length}</span> data
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-[13px] font-semibold text-gray-700">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
