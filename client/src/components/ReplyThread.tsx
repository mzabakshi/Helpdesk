import { useState } from "react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SenderType, createReplySchema, type CreateReplyInput } from "core";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Reply {
  id: string;
  body: string;
  senderType: SenderType;
  createdAt: string;
  author: { id: string; name: string } | null;
}

interface ReplyThreadProps {
  ticketId: string;
  customerName: string;
}

function errorMessage(err: unknown, fallback: string) {
  return axios.isAxiosError(err)
    ? (err.response?.data?.error ?? err.message)
    : fallback;
}

export default function ReplyThread({ ticketId, customerName }: ReplyThreadProps) {
  const queryClient = useQueryClient();
  const [replyError, setReplyError] = useState<string | null>(null);

  const { data: replies = [] } = useQuery<Reply[]>({
    queryKey: ["replies", ticketId],
    queryFn: async () => {
      const { data } = await axios.get<Reply[]>(`/api/tickets/${ticketId}/replies`, {
        withCredentials: true,
      });
      return data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateReplyInput>({ resolver: zodResolver(createReplySchema) });

  const replyMutation = useMutation({
    mutationFn: (data: CreateReplyInput) =>
      axios.post(`/api/tickets/${ticketId}/replies`, data, { withCredentials: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["replies", ticketId] });
      reset();
      setReplyError(null);
    },
    onError: (err) => {
      setReplyError(errorMessage(err, "Failed to send reply"));
    },
  });

  return (
    <div className="space-y-4">
      {replies.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Replies
          </h2>
          {replies.map((reply) => {
            const isAgent = reply.senderType === SenderType.Agent;
            const senderName = isAgent ? (reply.author?.name ?? "Agent") : customerName;
            return (
              <div
                key={reply.id}
                className={`rounded-md border p-4 space-y-1 ${isAgent ? "bg-muted/40" : ""}`}
              >
                <p className="text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">{senderName}</span>
                  <span className="ml-1 text-muted-foreground/70">
                    ({isAgent ? "agent" : "customer"})
                  </span>
                  {" · "}
                  {new Date(reply.createdAt).toLocaleString()}
                </p>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{reply.body}</p>
              </div>
            );
          })}
        </div>
      )}

      <form
        onSubmit={handleSubmit((data) => replyMutation.mutate(data))}
        className="space-y-2"
      >
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Reply
        </h2>
        <Textarea
          {...register("body")}
          placeholder="Write a reply…"
          rows={4}
          disabled={replyMutation.isPending}
          aria-label="Reply body"
        />
        {errors.body && (
          <p className="text-xs text-destructive">{errors.body.message}</p>
        )}
        {replyError && (
          <p className="text-xs text-destructive">{replyError}</p>
        )}
        <Button type="submit" size="sm" disabled={replyMutation.isPending}>
          {replyMutation.isPending ? "Sending…" : "Send reply"}
        </Button>
      </form>
    </div>
  );
}
