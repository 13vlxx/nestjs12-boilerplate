# NestJS 12 Boilerplate

Opinionated starter for a NestJS 12 REST API: ESM, MongoDB (Mongoose), Zod
validation end to end, JWT authentication with roles, and the production
basics (rate limiting, CORS, health check, graceful shutdown) already wired.

## Stack

| Concern           | Choice                                                                 |
| ----------------- | ---------------------------------------------------------------------- |
| Runtime           | Node 24 (LTS), ESM, pnpm                                               |
| Framework         | NestJS 12 + Express                                                    |
| Database          | MongoDB via `@nestjs/mongoose` / Mongoose 9                            |
| Validation        | Zod 4 + `nestjs-zod` — DTOs, env vars and responses share one schema   |
| Auth              | `@nestjs/passport` + `passport-jwt`, access + refresh tokens as Bearer |
| Password hashing  | bcrypt behind an upgradable `EncryptionService`                        |
| Rate limiting     | `@nestjs/throttler`                                                    |
| Health            | `@nestjs/terminus` (MongoDB ping)                                      |
| Docs              | Swagger UI at `/api/doc` (disabled in production)                      |
| Tooling           | oxlint, Prettier, Taskfile                                             |

## Getting started

```bash
pnpm install
pnpm seed        # drops the DB and inserts the users from src/seed/seed.data.ts
pnpm start:dev   # http://localhost:3000/api/v1 — Swagger at /api/doc
```

Requires a MongoDB reachable at `DATABASE_URL` (default `mongodb://localhost:27017/`).

Seeded accounts:

| Role  | Email                  | Password     |
| ----- | ---------------------- | ------------ |
| admin | `admin@example.com`    | `Admin1234!` |
| user  | `john.doe@example.com` | `Passw0rd!`  |

### Scripts

| Command           | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `pnpm start:dev`  | Start with file watching                               |
| `pnpm build`      | Compile to `dist/`                                     |
| `pnpm start:prod` | Run the compiled app                                   |
| `pnpm seed`       | **Drop the database**, recreate indexes, insert seeds  |
| `pnpm lint`       | oxlint (type-aware)                                    |
| `pnpm format`     | Prettier                                               |

The same commands are exposed through [Taskfile.yml](Taskfile.yml) (`task dev`, `task seed`, …).

## Configuration

Environment variables are loaded from `.env.development` then `.env`, and
validated at startup by the Zod schema in
[src/_utils/config/env.config.ts](src/_utils/config/env.config.ts). The app
refuses to boot with a clear error if anything is missing or malformed.

| Variable                      | Default | Description                                            |
| ----------------------------- | ------- | ------------------------------------------------------ |
| `PORT`                        | `3000`  |                                                        |
| `NODE_ENV`                    | —       | `development` \| `staging` \| `production`             |
| `CORS_ORIGINS`                | `""`    | Comma-separated allowed origins. Empty = CORS disabled |
| `DATABASE_URL`                | —       | MongoDB connection string                              |
| `DATABASE_NAME`               | —       |                                                        |
| `JWT_ACCESS_TOKEN_SECRET`     | —       | At least 32 characters                                 |
| `JWT_ACCESS_TOKEN_EXPIRATION` | `900`   | Seconds. Short: an access token cannot be revoked      |
| `JWT_REFRESH_TOKEN_SECRET`    | —       | At least 32 characters, different from the access one  |
| `JWT_REFRESH_TOKEN_EXPIRATION`| `604800`| Seconds (7 days)                                       |
| `THROTTLE_TTL`                | `60000` | Rate-limit window, milliseconds                        |
| `THROTTLE_LIMIT`              | `100`   | Max requests per window per IP                         |

Config is consumed through `ConfigService<EnvironmentVariables, true>` and is
fully typed: `config.get<JwtConfig>('JWT').ACCESS_TOKEN_SECRET`.

## Project layout

```
src/
├── _utils/            # cross-cutting: env config, filters, regex
├── auth/              # register / login, JWT strategy, guard, decorators
├── encryption/        # password hashing (see below)
├── health/            # GET /health
├── seed/              # pnpm seed
├── users/             # users module (schema, repository, service, mapper)
├── app.module.ts
└── main.ts
```

Each feature module follows the same shape:

```
users/
├── _utils/
│   ├── dtos/requests/     # Zod schemas + createZodDto
│   ├── dtos/responses/
│   ├── errors/            # injectable exceptions catalogue
│   └── types/
├── users.controller.ts    # only delegates to the service
├── users.service.ts       # business logic, returns DTOs to controllers
├── users.repository.ts    # Mongoose queries
├── users.mapper.ts        # Document -> DTO
├── users.schema.ts
└── users.module.ts
```

## Validation & typesafety

Every DTO is a Zod schema wrapped with `createZodDto`:

```ts
export const createUserSchema = z.strictObject({
  email: z.email().meta({ example: 'john.doe@example.com' }),
  password: z.string().min(8).max(64).regex(passwordRegex),
});

export class CreateUserDto extends createZodDto(createUserSchema) {}
```

- `ZodValidationPipe` (global) validates `@Body()`, `@Query()`, `@Param()`.
  Unknown keys are rejected thanks to `strictObject`.
- `@ZodResponse({ type: GetUserDto })` on a route sets the TypeScript return
  type, the runtime serialisation (extra fields are stripped, so a document's
  `password` can never leak) and the Swagger schema in one place. Returning
  the wrong shape is a compile error.
- `.meta({ example, description })` feeds Swagger.

## Authentication & authorization

- `POST /auth/register` and `POST /auth/login` return
  `{ accessToken, refreshToken, user }`.
- Send the **access token** as `Authorization: Bearer <accessToken>` on every
  request. It is short-lived (15 min by default) and cannot be revoked.
- When it expires, call `POST /auth/refresh` with the **refresh token** as
  Bearer: you get a fresh pair. Refresh tokens are rotated on every call, and
  only the latest one is valid (its SHA-256 is stored on the user).
  Presenting an already-rotated refresh token is treated as a theft: the whole
  session is revoked and the user must log in again.
- `POST /auth/logout` (access token) revokes the refresh token.
- Single device: logging in from another device replaces the previous refresh
  token. Switch `hashedRefreshToken` for a `sessions` collection if you need
  concurrent devices.
- **Every route is protected by default** (`JwtAuthGuard` registered as
  `APP_GUARD`). Opt out with `@Public()` on a route or a whole controller.
- Restrict a route to one or more roles with `@Protect(UserRoleEnum.ADMIN)`.
  Wrong role → `403 INSUFFICIENT_ROLE`.
- `@ConnectedUser()` injects the authenticated `UserDocument`. The user is
  loaded from the database on every request, so a deleted user or a role
  change is effective immediately.
- Roles live in [src/users/_utils/types/user-role.enum.ts](src/users/_utils/types/user-role.enum.ts).

```ts
@Controller('users')
export class UsersController {
  @Get('me')                           // any authenticated user
  getMe(@ConnectedUser() user: UserDocument) { … }

  @Get()
  @Protect(UserRoleEnum.ADMIN)          // admins only
  findAll() { … }

  @Public()
  @Get('public-stuff')                 // no token needed
  publicStuff() { … }
}
```

Swagger summaries are prefixed automatically with who can call the route:
nothing for public routes, `(ALL)` for authenticated, `(ADMIN)` / `(ADMIN, USER)`
when restricted.

### Password hashing

Hashes are stored as `{<encrypter>}<hash>`, e.g. `{bcrypt}$2b$10$…`. To move
to a stronger algorithm, add an `Encrypter` with a higher `securityLevel` in
[src/encryption/encryption.service.ts](src/encryption/encryption.service.ts):
new passwords use it right away and existing ones are transparently re-hashed
on the user's next successful login.

## Rate limiting

Global limit from `THROTTLE_LIMIT` / `THROTTLE_TTL` per IP. `/auth/*` is
capped at 10 requests per minute regardless, and `/health` is exempt.
Override per controller or route with `@Throttle()` / `@SkipThrottle()`.

## Health check

`GET /api/v1/health` (public, not rate-limited) pings MongoDB and answers
`200` or `503` with details, in the Terminus format expected by most
orchestrators.

## Error format

| Situation                    | Status | Body                                                  |
| ---------------------------- | ------ | ----------------------------------------------------- |
| Invalid payload              | 400    | `{ message: "Validation failed", errors: [...] }`     |
| Missing / invalid token      | 401    | `{ message: "Unauthorized" }`                         |
| Wrong credentials            | 401    | `{ message: "WRONG_CREDENTIALS" }`                    |
| Refresh token invalid/rotated| 401    | `{ message: "INVALID_REFRESH_TOKEN" }`                |
| Insufficient role            | 403    | `{ message: "INSUFFICIENT_ROLE" }`                    |
| Email already registered     | 409    | `{ message: "EMAIL_ALREADY_USED" }`                   |
| Duplicate key at DB level    | 409    | `{ message: "DUPLICATE_KEY" }`                        |
| Rate limit exceeded          | 429    | `{ message: "ThrottlerException: Too Many Requests" }`|
| Unexpected MongoDB error     | 500    | `{ message: "INTERNAL_SERVER_ERROR" }` (details logged)|

Module-specific error messages are declared as injectable catalogues
(`UsersExceptions`, `AuthExceptions`) so they are easy to find and reuse.

## Adding a module

```bash
nest g module orders && nest g controller orders && nest g service orders
```

Then mirror the `users` layout: schema, repository, mapper, DTOs in
`_utils/dtos`, exceptions in `_utils/errors`. Routes are protected by default;
add `@Public()` or `@Protect(role)` as needed.
