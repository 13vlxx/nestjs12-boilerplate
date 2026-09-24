import z from 'zod';

export const authUserSchema = z
  .object({
    sub: z.string().min(1),
    scope: z.string().optional(),
  })
  .transform(({ sub, scope }) => ({
    id: sub,
    scopes: scope?.split(' ').filter(Boolean) ?? [],
  }));

export type AuthUser = z.output<typeof authUserSchema>;
