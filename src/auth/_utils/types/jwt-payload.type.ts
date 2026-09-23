import z from 'zod';

/** Claims we put in the tokens. Validated again on every request by the strategies. */
export const jwtPayloadSchema = z.object({
  sub: z.uuid(),
  email: z.email(),
  /** Unique token id: guarantees two tokens issued in the same second still differ. */
  jti: z.uuid(),
});

export type JwtPayload = z.infer<typeof jwtPayloadSchema>;
