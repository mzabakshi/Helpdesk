import { useState } from "react";
import axios from "axios";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface TicketSummaryProps {
  ticketId: string;
}

function errorMessage(err: unknown, fallback: string) {
  return axios.isAxiosError(err)
    ? (err.response?.data?.error ?? err.message)
    : fallback;
}

export default function TicketSummary({ ticketId }: TicketSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const summarizeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await axios.post<{ summary: string }>(
        `/api/tickets/${ticketId}/summarize`,
        {},
        { withCredentials: true }
      );
      return data.summary;
    },
    onSuccess: (text) => {
      setSummary(text);
      setSummaryError(null);
    },
    onError: (err) => {
      setSummaryError(errorMessage(err, "Failed to summarize ticket"));
    },
  });

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={summarizeMutation.isPending}
        onClick={() => summarizeMutation.mutate()}
      >
        <Sparkles className="mr-1 h-3.5 w-3.5" />
        {summarizeMutation.isPending
          ? "Summarizing…"
          : summary
          ? "Re-generate summary"
          : "Summarize"}
      </Button>

      {summaryError && (
        <p className="text-xs text-destructive">{summaryError}</p>
      )}

      {summary && (
        <div className="rounded-md border bg-muted/40 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            AI Summary
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
        </div>
      )}
    </div>
  );
}
