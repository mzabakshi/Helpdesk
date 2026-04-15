import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").min(3, "Name must be at least 3 characters."),
  email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().trim().min(1, "Password is required.").min(8, "Password must be at least 8 characters."),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").min(3, "Name must be at least 3 characters."),
  email: z.string().min(1, "Email is required.").email("Enter a valid email address."),
  password: z
    .string()
    .trim()
    .refine((v) => v === "" || v.length >= 8, { message: "Password must be at least 8 characters." })
    .optional(),
});

export type EditUserInput = z.infer<typeof editUserSchema>;
