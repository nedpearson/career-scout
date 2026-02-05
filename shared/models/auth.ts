import { z } from "zod";

/**
 * Minimal user shape returned to the client.
 * (Do not include password hashes or provider tokens.)
 */
export const authUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().min(1),
  name: z.string().optional().nullable(),
});

export type AuthUser = z.infer<typeof authUserSchema>;

export const authLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

export type AuthLogin = z.infer<typeof authLoginSchema>;

export const authRegisterSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().optional(),
  password: z.string().min(8),
});

export type AuthRegister = z.infer<typeof authRegisterSchema>;

