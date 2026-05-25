import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";

const SIZE_OPTIONS = [10, 25, 50, 100];

export default function DataTable({ columns, data, renderRow, renderCard, viewMode = "table", itemLabel = "records", toolbar, filterSlot, viewToggle }) {
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPage(1); }, [data, pageSize]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const start      = (page - 1) * pageSize;
  const pageData   = data.slice(start, start + pageSize);

  const goTo = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  const pageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="flex flex-col gap-3">

      {/* ── Top bar ── */}
      <div className="dt-topbar">
        <div className="dt-toolbar">{toolbar}</div>
        {filterSlot && <div className="dt-filter">{filterSlot}</div>}
        <div className="dt-perpage">
          {viewToggle}
          <span className="text-sm text-muted-foreground">per page</span>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {SIZE_OPTIONS.map(s => (
                <SelectItem key={s} value={String(s)}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Grid or Table ── */}
      {viewMode === "grid" && renderCard ? (
        <div key="grid" className="emp-grid-container">
          {pageData.length > 0 ? (
            pageData.map((item, index) => renderCard(item, start + index))
          ) : (
            <div className="emp-grid-empty">No results found.</div>
          )}
        </div>
      ) : (
        <div key="table" className="rounded-md border overflow-auto w-full mx-0 emp-table-fade">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key} className={col.className || ""}>{col.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.length > 0 ? (
                pageData.map((item, index) => renderRow(item, start + index))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-32 text-center">
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "#94A3B8" }}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>No results found.</span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Pagination Footer ── */}
      {data.length > 0 && (
        <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">

          <span>
            {start + 1}–{Math.min(start + pageSize, data.length)} of {data.length} {itemLabel}
          </span>

          <div className="flex items-center gap-1">
            <button onClick={() => goTo(1)}        disabled={page === 1}          className="pagination-btn"><ChevronsLeft  size={15} /></button>
            <button onClick={() => goTo(page - 1)} disabled={page === 1}          className="pagination-btn"><ChevronLeft   size={15} /></button>

            {pageNumbers().map((p, i) =>
              p === "..." ? (
                <span key={`e-${i}`} className="px-1">…</span>
              ) : (
                <button key={p} onClick={() => goTo(p)} className={`pagination-btn${page === p ? " active" : ""}`}>
                  {p}
                </button>
              )
            )}

            <button onClick={() => goTo(page + 1)}   disabled={page === totalPages} className="pagination-btn"><ChevronRight  size={15} /></button>
            <button onClick={() => goTo(totalPages)} disabled={page === totalPages} className="pagination-btn"><ChevronsRight size={15} /></button>
          </div>

        </div>
      )}
    </div>
  );
}
