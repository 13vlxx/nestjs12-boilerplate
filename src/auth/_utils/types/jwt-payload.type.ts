import z from 'zod';

/** Claims we put in the access token. Validated again on every request by JwtStrategy. */
export const jwtPayloadSchema = z.object({
  sub: z.string(),
  email: z.email(),
});

export type JwtPayload = z.infer<typeof jwtPayloadSchema>;
