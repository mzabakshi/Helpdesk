import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { type SortingState } from "@tanstack/react-table";
import { TicketStatus, TicketCategory } from "core";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TicketsTable from "./TicketsTable";

interface Ticket {
  id: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  status: TicketStatus;
  category: TicketCategory;
  createdAt: string;
}

interface TicketsResponse {
  data: Ticket[];
  total: number;
  page: number;
  pageSize: number;
}

const statusOptions = [
  { label: "Open", value: TicketStatus.Open },
  { label: "Resolved", value: TicketStatus.Resolved },
  { label: "Closed", value: TicketStatus.Closed },
];

const categoryOptions = [
  { label: "None", value: TicketCategory.None },
  { label: "General Question", value: TicketCategory.GeneralQuestion },
  { label: "Technical Issue", value: TicketCategory.TechnicalIssue },
  { label: "Refund Request", value: TicketCategory.RefundRequest },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const sortBy = sorting[0]?.id ?? "createdAt";
  const order = sorting[0]?.desc === false ? "asc" : "desc";
  const hasFilters = search !== "" || status !== "" || category !== "";

  const { data, isLoading, error } = useQuery<TicketsResponse>({
    queryKey: ["tickets", sorting, search, status, category, page, pageSize],
    queryFn: async () => {
      const { data } = await axios.get<TicketsResponse>("/api/tickets", {
        params: {
          sortBy,
          order,
          page,
          pageSize,
          ...(search && { search }),
          ...(status && { status }),
          ...(category && { category }),
        },
        withCredentials: true,
      });
      return data;
    },
  });

  const tickets = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  function clearFilters() {
    setSearch("");
    setStatus("");
    setCategory("");
    setPage(1);
  }

  // Reset to page 1 when filters/sort change
  function handleSortingChange(updater: SortingState | ((prev: SortingState) => SortingState)) {
    setSorting(updater);
    setPage(1);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value: string | null) {
    setStatus(!value || value === "all" ? "" : value);
    setPage(1);
  }

  function handleCategoryChange(value: string | null) {
    setCategory(!value || value === "all" ? "" : value);
    setPage(1);
  }

  function handlePageSizeChange(value: string | null) {
    if (value) setPageSize(Number(value));
    setPage(1);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Tickets</h1>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Input
          placeholder="Search subject, name or email…"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-72"
          aria-label="Search tickets"
        />

        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-48" aria-label="Filter by category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categoryOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {error && (
        <p className="text-destructive">
          {axios.isAxiosError(error) ? (error.response?.data?.error ?? error.message) : "Failed to load tickets"}
        </p>
      )}

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: pageSize }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <TicketsTable
            tickets={tickets}
            sorting={sorting}
            onSortingChange={handleSortingChange}
          />

          {/* Pagination controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page</span>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                {total === 0
                  ? "No results"
                  : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
