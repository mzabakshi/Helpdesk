import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type SortingState,
  type OnChangeFn,
} from "@tanstack/react-table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { TicketStatus, TicketCategory } from "core";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Ticket {
  id: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  status: TicketStatus;
  category: TicketCategory;
  createdAt: string;
}

interface Props {
  tickets: Ticket[];
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
}

const statusVariant: Record<TicketStatus, "default" | "secondary" | "outline"> = {
  [TicketStatus.Open]: "default",
  [TicketStatus.Resolved]: "secondary",
  [TicketStatus.Closed]: "outline",
};

const categoryLabel: Record<TicketCategory, string> = {
  [TicketCategory.GeneralQuestion]: "General Question",
  [TicketCategory.TechnicalIssue]: "Technical Issue",
  [TicketCategory.RefundRequest]: "Refund Request",
};

const columnHelper = createColumnHelper<Ticket>();

const columns = [
  columnHelper.accessor("subject", {
    header: "Subject",
    enableSorting: true,
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor("fromName", {
    header: "From",
    enableSorting: true,
    cell: (info) => (
      <>
        <span className="block">{info.getValue()}</span>
        <span className="text-sm text-muted-foreground">{info.row.original.fromEmail}</span>
      </>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    enableSorting: true,
    cell: (info) => (
      <Badge variant={statusVariant[info.getValue()]}>
        {info.getValue()}
      </Badge>
    ),
  }),
  columnHelper.accessor("category", {
    header: "Category",
    enableSorting: true,
    cell: (info) => (
      <span className="text-muted-foreground">{categoryLabel[info.getValue()]}</span>
    ),
  }),
  columnHelper.accessor("createdAt", {
    header: "Received",
    enableSorting: true,
    cell: (info) => (
      <span className="text-muted-foreground">
        {new Date(info.getValue()).toLocaleDateString()}
      </span>
    ),
  }),
];

export default function TicketsTable({ tickets, sorting, onSortingChange }: Props) {
  const table = useReactTable({
    data: tickets,
    columns,
    state: { sorting },
    onSortingChange,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const sorted = header.column.getIsSorted();
              return (
                <TableHead key={header.id}>
                  {header.column.getCanSort() ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {sorted === "asc" ? (
                        <ArrowUp className="ml-1 h-3 w-3" />
                      ) : sorted === "desc" ? (
                        <ArrowDown className="ml-1 h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
                      )}
                    </Button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowCount() === 0 && (
          <TableRow>
            <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
              No tickets found.
            </TableCell>
          </TableRow>
        )}
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
