import { z } from "zod";

export enum SenderType {
  Agent = "agent",
  Customer = "customer",
}

export const createReplySchema = z.object({
  body: z.string().min(1, "Reply cannot be empty").max(5000, "Reply is too long"),
});

export type CreateReplyInput = z.infer<typeof createReplySchema>;
