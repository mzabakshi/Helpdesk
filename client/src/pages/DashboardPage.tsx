import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { type Stats } from "core";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Inbox, CircleDot, Bot, TrendingUp, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatDuration(ms: number): string {
  if (ms <= 0) return "N/A";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDateLabel(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const STATS = [
  {
    key: "totalTickets" as keyof Stats,
    title: "Total Tickets",
    icon: Inbox,
    format: (v: number) => v.toString(),
  },
  {
    key: "openTickets" as keyof Stats,
    title: "Open Tickets",
    icon: CircleDot,
    format: (v: number) => v.toString(),
  },
  {
    key: "resolvedByAI" as keyof Stats,
    title: "Resolved by AI",
    icon: Bot,
    format: (v: number) => v.toString(),
  },
  {
    key: "percentResolvedByAI" as keyof Stats,
    title: "AI Resolution Rate",
    icon: TrendingUp,
    format: (v: number) => `${v.toFixed(1)}%`,
  },
  {
    key: "avgResolutionTimeMs" as keyof Stats,
    title: "Avg Resolution Time",
    icon: Clock,
    format: (v: number) => formatDuration(v),
  },
];

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await axios.get<Stats>("/api/stats");
      return res.data;
    },
  });

  if (isError) {
    return (
      <div className="p-8">
        <p className="text-destructive text-sm">Failed to load dashboard stats.</p>
      </div>
    );
  }

  const chartData = data?.ticketsPerDay.map((d) => ({
    date: formatDateLabel(d.date),
    count: d.count,
  }));

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your support activity</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {STATS.map(({ key, title, icon: Icon, format }) => (
          <Card key={key} className="shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {title}
              </CardTitle>
              <div className="p-1.5 rounded-md bg-primary/10">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-3xl font-bold tracking-tight">{format(data![key] as number)}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold">Tickets per Day</CardTitle>
          <p className="text-xs text-muted-foreground">Last 30 days</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={256}>
              <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip
                  cursor={{ fill: "oklch(0.94 0.006 264 / 60%)" }}
                  contentStyle={{
                    borderRadius: "6px",
                    border: "1px solid oklch(0.89 0.008 264)",
                    background: "white",
                    color: "oklch(0.13 0.02 264)",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [value, "Tickets"]}
                />
                <Bar dataKey="count" fill="oklch(0.52 0.22 264)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
