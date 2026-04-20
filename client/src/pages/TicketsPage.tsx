import { useState } from "react";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { type SortingState } from "@tanstack/react-table";
import { TicketStatus, TicketCategory } from "core";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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

const statusOptions: { label: string; value: TicketStatus }[] = [
  { label: "Open", value: TicketStatus.Open },
  { label: "Resolved", value: TicketStatus.Resolved },
  { label: "Closed", value: TicketStatus.Closed },
];

const categoryOptions: { label: string; value: TicketCategory }[] = [
  { label: "General Question", value: TicketCategory.GeneralQuestion },
  { label: "Technical Issue", value: TicketCategory.TechnicalIssue },
  { label: "Refund Request", value: TicketCategory.RefundRequest },
];

export default function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [category, setCategory] = useState<string>("");

  const sortBy = sorting[0]?.id ?? "createdAt";
  const order = sorting[0]?.desc === false ? "asc" : "desc";

  const hasFilters = search !== "" || status !== "" || category !== "";

  const { data: tickets = [], isLoading, error } = useQuery<Ticket[]>({
    queryKey: ["tickets", sorting, search, status, category],
    queryFn: async () => {
      const { data } = await axios.get<Ticket[]>("/api/tickets", {
        params: {
          sortBy,
          order,
          ...(search && { search }),
          ...(status && { status }),
          ...(category && { category }),
        },
        withCredentials: true,
      });
      return data;
    },
  });

  function clearFilters() {
    setSearch("");
    setStatus("");
    setCategory("");
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
          onChange={(e) => setSearch(e.target.value)}
          className="w-72"
          aria-label="Search tickets"
        />

        <Select
          value={status}
          onValueChange={(v) => setStatus(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statusOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={category}
          onValueChange={(v) => setCategory(v === "all" ? "" : (v ?? ""))}
        >
          <SelectTrigger className="w-48" aria-label="Filter by category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categoryOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
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
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      )}

      {!isLoading && !error && (
        <TicketsTable
          tickets={tickets}
          sorting={sorting}
          onSortingChange={setSorting}
        />
      )}
    </div>
  );
}
