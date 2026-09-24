# NestJS 12 Boilerplate

Opinionated starter for a NestJS 12 REST API: ESM, MongoDB (Mongoose), Zod
validation end to end, authentication delegated to a self-hosted Logto
(access tokens verified locally, role-based `@Protect()`), and the production
basics (rate limiting, CORS, health check, graceful shutdown) already wired.

## Stack

| Concern           | Choice                                                                 |
| ----------------- | ---------------------------------------------------------------------- |
| Runtime           | Node 24 (LTS), ESM, pnpm                                               |
| Framework         | NestJS 12 + Express                                                    |
| Database          | MongoDB via `@nestjs/mongoose` / Mongoose 9                            |
| Validation        | Zod 4 + `nestjs-zod` — DTOs, env vars and responses share one schema   |
| Auth              | [Logto](https://logto.io) (self-hosted): OIDC, users, roles, emails    |
| Token check       | `jose` against Logto's JWKS — no call to Logto per request             |
| Users             | Logto Management API (`@logto/api`), profile data in `customData`      |
| Files             | S3-compatible storage (RustFS locally), multipart upload, presigned reads|
| Rate limiting     | `@nestjs/throttler`                                                    |
| Health            | `@nestjs/terminus` (MongoDB ping)                                      |
| Docs              | Swagger UI at `/api/doc`, Scalar at `/api/doc-scalar` (not in production) |
| Tooling           | oxlint, Prettier, Taskfile                                             |

## Getting started

```bash
pnpm install
docker compose up -d --wait   # MongoDB, Logto (+ its Postgres), Maildev, RustFS
```

Then configure Logto once (see [Logto setup](#logto-setup)), fill
`LOGTO_M2M_CLIENT_ID` / `LOGTO_M2M_CLIENT_SECRET`, and:

```bash
pnpm seed                     # drops MongoDB, creates the API resource, roles and users in Logto
pnpm start:dev                # http://localhost:3000/api/v1 — Swagger at /api/doc, Scalar at /api/doc-scalar
```

### Local services (`docker-compose.yml`)

| Service  | Image                  | Ports                              | Notes                                         |
| -------- | ---------------------- | ---------------------------------- | --------------------------------------------- |
| MongoDB  | `mongo:8.3`            | `27018` → 27017                    | Business data                                 |
| Logto    | `svhd/logto:1.43.0`    | `3001` OIDC, `3002` admin console  | Users, sign-in, roles                         |
| Logto DB | `postgres:18.6-alpine` | —                                  | Logto's own database (not exposed)            |
| Maildev  | `maildev/maildev`      | `1025` SMTP, `1080` inbox UI       | Catches Logto's emails (SMTP connector)       |
| RustFS   | `rustfs/rustfs`        | `9000` S3 API, `9001` console      | S3-compatible storage, `rustfsadmin` / `rustfsadmin` |

Data lives in named volumes; `docker compose down -v` (or `task reset`) wipes it
— including Logto's configuration and users.
The API itself runs on the host.

Seeded Logto accounts:

| Roles         | Email                  | Password                |
| ------------- | ---------------------- | ----------------------- |
| `admin`, `user` | `admin@example.com`  | `Adm1n-Boilerplate!`    |
| `user`        | `john.doe@example.com` | `J0hn-Doe-Boilerplate!` |

### Scripts

| Command           | Description                                                        |
| ----------------- | ------------------------------------------------------------------ |
| `task up`         | Start MongoDB, Logto, Maildev and RustFS in Docker                 |
| `task down`       | Stop them (`task reset` also deletes their data)                   |
| `pnpm start:dev`  | Start with file watching                                           |
| `pnpm build`      | Compile to `dist/`                                                 |
| `pnpm start:prod` | Run the compiled app                                               |
| `pnpm seed`       | **Drop MongoDB**, then create what is missing in Logto (idempotent) |
| `pnpm lint`       | oxlint (type-aware)                                                |
| `pnpm format`     | Prettier                                                           |

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
| `LOGTO_ENDPOINT`              | —       | Logto base URL (`http://localhost:3001`). Issuer = `<endpoint>/oidc` |
| `LOGTO_API_RESOURCE`          | —       | API identifier in Logto = the tokens' `aud` (`http://localhost:3000/api/v1`) |
| `LOGTO_M2M_CLIENT_ID` / `LOGTO_M2M_CLIENT_SECRET` | — | M2M app allowed to call the Management API |
| `THROTTLE_TTL`                | `60000` | Rate-limit window, milliseconds                        |
| `THROTTLE_LIMIT`              | `100`   | Max requests per window per IP                         |
| `S3_ENDPOINT`                 | —       | e.g. `http://localhost:9000` (RustFS) or AWS endpoint  |
| `S3_REGION`                   | `us-east-1` |                                                    |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | —   |                                                        |
| `S3_BUCKET`                   | —       | Created at startup if missing                          |
| `S3_FORCE_PATH_STYLE`         | `true`  | `true` for RustFS/MinIO, `false` for AWS               |

Config is consumed through `ConfigService<EnvironmentVariables, true>` and is
fully typed: `config.get<LogtoConfig>('LOGTO').API_RESOURCE`.

## Project layout

```
src/
├── _utils/            # cross-cutting: env config, filters, regex
├── auth/              # global JwtAuthGuard (Logto tokens), @Public / @Protect / @ConnectedUser
├── health/            # GET /health
├── logto/             # Management API client (LogtoService)
├── s3/                # S3 client, FormDataRequest/uploadedFile helpers, S3File sub-document
├── seed/              # pnpm seed
├── users/             # /users routes, backed by Logto (no collection)
├── app.module.ts
└── main.ts
yaak/                  # Yaak workspace (directory sync): every route + the token request
```

Each feature module follows the same shape (`users` has no repository nor
schema: its data lives in Logto):

```
<feature>/
├── _utils/
│   ├── dtos/requests/     # Zod schemas + createZodDto
│   ├── dtos/responses/
│   ├── errors/            # injectable exceptions catalogue
│   └── types/
├── <feature>.controller.ts    # only delegates to the service
├── <feature>.service.ts       # business logic, returns DTOs to controllers
├── <feature>.repository.ts    # Mongoose queries
├── <feature>.mapper.ts        # Document -> DTO
├── <feature>.schema.ts
└── <feature>.module.ts
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
  type, the runtime serialisation (extra fields are stripped, so nothing
  from a document or a Logto user leaks by accident) and the Swagger schema in one place. Returning
  the wrong shape is a compile error.
- `.meta({ example, description })` feeds Swagger.

## Authentication & authorization

Sign-up, sign-in, password reset, email verification, MFA and social login
are handled by Logto: the API has no auth route and stores no password.

- The front-end signs users in with a Logto SDK and asks for an access token
  **for the API resource** (`getAccessToken('http://localhost:3000/api/v1')`),
  then sends it as `Authorization: Bearer <token>`. Without the resource, Logto
  returns an opaque token or one with another audience: every call is a 401.
- **Every route is protected by default** (`JwtAuthGuard` registered as
  `APP_GUARD`). It verifies the token's signature against Logto's JWKS (keys
  cached by `jose`), its issuer (`<LOGTO_ENDPOINT>/oidc`), audience
  (`LOGTO_API_RESOURCE`) and expiry. Nothing is fetched from Logto per
  request. Opt out with `@Public()` on a route or a whole controller.
- **Authorization is role-based.** The user roles are created in Logto
  (`user`, the default role given on sign-up, and `admin`) and mirrored by
  [user-role.enum.ts](src/users/_utils/types/user-role.enum.ts). Logto does
  not put roles in access tokens by default: a *Custom JWT* script (installed
  by `pnpm seed`, see [seed.data.ts](src/seed/seed.data.ts)) adds a `roles`
  claim, so `@Protect(UserRoleEnum.ADMIN)` is a local check. Several roles =
  any of them. Missing → `403 INSUFFICIENT_ROLE`. Roles on a route replace
  those of its controller.
- `@ConnectedUser()` injects `AuthUser = { id, roles }` decoded from the
  token (`id` is the Logto user id). Fetch the profile through
  `UsersService.findById()` only where it is needed.
- A role change applies when the access token is renewed (Logto's default
  TTL is one hour, set per API resource).

```ts
@Controller('users')
export class UsersController {
  @Get('me')
  @Protect()                           // any authenticated user
  @ApiOperation({ summary: 'Get the connected user' }) // → "Get the connected user (ALL)"
  getMe(@ConnectedUser() user: AuthUser) { … }

  @Get()
  @Protect(UserRoleEnum.ADMIN)         // admins only
  @ApiOperation({ summary: 'List users' })             // → "List users (ADMIN)"
  findAll() { … }

  @Public()
  @Get('public-stuff')                 // no token needed
  publicStuff() { … }
}
```

Access is documented by the decorators themselves, in standard OpenAPI that
Swagger and Scalar render natively: `@Public()` removes the bearer
requirement, `@Protect()` adds the `401` response and `@Protect(roles…)` the
`403` with the required roles. Each route names itself with
`@ApiOperation({ summary })`, and `@Protect()` appends the access to that
title — `(ALL)` or `(ADMIN)` — so it reads from the collapsed list. Keep
`@ApiOperation` **below** `@Protect`: decorators apply bottom-up, and an
`@ApiOperation` above would overwrite the label.

### Getting a token

Every seeded user has a Logto **personal access token** (PAT) named `dev`,
and `pnpm seed` creates a public app, *NestJS Boilerplate - dev tokens*,
allowed to exchange a PAT for an access token to `LOGTO_API_RESOURCE`
(token exchange, RFC 8693). The seed prints what you need:

```
LOGTO_DEV_APP_ID = <app id>
LOGTO_PAT (admin@example.com) = pat_…
LOGTO_PAT (john.doe@example.com) = pat_…
```

**With Yaak** — the workspace lives in [yaak/](yaak) (*Open workspace* →
pick the folder, or *Sync to directory*):

1. Create a **private** environment (not shared, so it is never written to
   `yaak/`) with `LOGTO_DEV_APP_ID` and `LOGTO_PAT`; one per user you want to
   impersonate (e.g. *admin*, *john*).
2. Send any request of the *API* folder: its Bearer is
   `response.body.path()` of *Logto / Get access token*, sent automatically
   when there is no response yet or the last one is older than 55 min.

**With curl**:

```bash
curl -s http://localhost:3001/oidc/token \
  -d grant_type=urn:ietf:params:oauth:grant-type:token-exchange \
  -d subject_token_type=urn:logto:token-type:personal_access_token \
  -d client_id=<LOGTO_DEV_APP_ID> -d subject_token=<LOGTO_PAT> \
  -d resource=http://localhost:3000/api/v1
```

It is the same access token the front-end would get — same roles, same
audience — valid one hour. PATs do not expire: never seed a production
tenant.

### Users & custom data

There is no `users` collection. `LogtoService` wraps the Management API
(typed client from `@logto/api`, authenticated as the M2M app) and
`UsersService` reads users from it. App-specific profile data lives in the
user's `customData`, typed and validated by
[user-custom-data.type.ts](src/users/_utils/types/user-custom-data.type.ts);
`PATCH` only merges the given keys. Custom data can be edited outside the
API (Logto console, Account API): never store anything authorization-related
there, and validate it on read.

To reference a user from a business document, store their Logto id; for
data that must look the same forever (an order's customer name…), store a
copy on the document.

### Logto setup

Once per environment (the admin console is at <http://localhost:3002>):

1. **Create the admin account** of the console (first visit).
2. **Applications → Machine-to-machine → Create.** Assign it the role
   *Logto Management API access*. Copy its App ID / App secret into
   `LOGTO_M2M_CLIENT_ID` / `LOGTO_M2M_CLIENT_SECRET`.
3. **`pnpm seed`**: creates the API resource `LOGTO_API_RESOURCE`, the
   *Custom JWT* script for user access tokens (`roles` claim — it replaces
   any existing script, visible under *Custom JWT* in the console), the
   `user` (default) and `admin` roles, the seeded users with their `dev`
   personal access tokens and the *dev tokens* app, then prints what Yaak
   needs (see [Getting a token](#getting-a-token)). Re-run it after adding a
   `UserRoleEnum` value (and add it to `seedRoles`).
4. **Applications → your front-end** (e.g. *Single page app*): redirect URIs
   of your front, and `resources: [LOGTO_API_RESOURCE]` in the SDK config.
5. *Optional* — **Connectors → Email → SMTP**: host `maildev`, port `1025`,
   no auth, so verification / reset codes land in Maildev
   (<http://localhost:1080>).

## Files & uploads

Uploads are `multipart/form-data` and the whole form, **files included**, is
one Zod DTO validated by the global pipe, like any JSON body:

```ts
export const updateProfilePictureSchema = z.strictObject({
  file: uploadedFile({ mimeTypes: IMAGE_MIME_TYPES, maxSize: toMB(8) }),
});

@Put('me/profile-picture')
@FormDataRequest({ files: [{ name: 'file' }], maxFileSize: toMB(8) })
updateProfilePicture(@Body() dto: UpdateProfilePictureDto) {
  // dto.file: File
}
```

Several optional files work the same way — `maxCount` on the field and
`z.array(uploadedFile(...)).max(5).optional()` in the schema — and text
fields, cross-field `.refine()`s and `strictObject` apply as usual.

- `@FormDataRequest()` ([form-data-request.decorator.ts](src/s3/_utils/decorators/form-data-request.decorator.ts))
  runs multer with a hard size/count limit (413 / 400 beyond it), then moves
  each uploaded file into `req.body` as a web `File` whose `type` is the MIME
  **detected from its magic bytes** ([magic-bytes.ts](src/s3/_utils/magic-bytes.ts)),
  and marks the route as multipart for Swagger.
- `uploadedFile({ mimeTypes, maxSize })` ([uploaded-file.schema.ts](src/s3/_utils/schemas/uploaded-file.schema.ts))
  is `z.file()` with size and type checks. Because `type` comes from the
  content, a `.txt` renamed `.png` is rejected. Allowed types live in
  [mime-type.enum.ts](src/s3/_utils/types/mime-type.enum.ts); adding one means
  adding its signature to `magic-bytes.ts`.
- Text fields arrive as strings in multipart: use `z.coerce.number()` /
  `z.stringbool()` for numbers and booleans.
- Swagger renders the form with file pickers, so uploads are testable from
  `/api/doc`.

Storage: `S3Service.uploadFile(file, folder)` puts the object in the bucket
(folder layout in [s3-keys.mapper.ts](src/s3/s3-keys.mapper.ts)) and returns
an `S3File` (`key`, `fileName`, `mimeType`, `size`) to embed on the owning
document (or in a Logto user's `customData`) — no `files` collection, no
references. `S3Mapper.toGetS3FileDto`
turns it into `{ url, fileName, mimeType, size }` with a presigned URL
(15 min).

`PUT /users/me/profile-picture` is the shipped example: single required
image stored in the user's `customData.profilePicture`, previous object
deleted on replace, `GetUserDto.profilePictureUrl` as a presigned URL or
`null`. A key outside `users/<id>/profile-picture/` is ignored (neither
presigned nor deleted), since custom data can be edited outside the API. `objectIdSchema`
([object-id.schema.ts](src/_utils/schemas/object-id.schema.ts)) is there for
`@Param()` DTOs so a malformed id yields a 400 instead of a Mongoose
`CastError`.

## Rate limiting

Global limit from `THROTTLE_LIMIT` / `THROTTLE_TTL` per IP; `/health` is
exempt. Sign-in attempts are rate-limited by Logto itself.
Override per controller or route with `@Throttle()` / `@SkipThrottle()`.

## Health check

`GET /api/v1/health` (public, not rate-limited) pings MongoDB and answers
`200` or `503` with details, in the Terminus format expected by most
orchestrators.

## Error format

| Situation                    | Status | Body                                                  |
| ---------------------------- | ------ | ----------------------------------------------------- |
| Invalid payload              | 400    | `{ message: "Validation failed", errors: [...] }`     |
| Missing / invalid / expired token | 401 | `{ message: "INVALID_TOKEN" }`                 |
| Upload rejected (type/size)  | 400    | `{ message: "Validation failed", errors: [...] }`     |
| Upload over multer limit     | 413    | `{ message: "File too large" }`                        |
| Missing role                 | 403    | `{ message: "INSUFFICIENT_ROLE" }`                    |
| User deleted in Logto        | 404    | `{ message: "USER_NOT_FOUND" }`                       |
| Duplicate key at DB level    | 409    | `{ message: "DUPLICATE_KEY" }`                        |
| Rate limit exceeded          | 429    | `{ message: "ThrottlerException: Too Many Requests" }`|
| Unexpected MongoDB error     | 500    | `{ message: "INTERNAL_SERVER_ERROR" }` (details logged)|
| Logto Management API failure | 500    | `{ message: "Internal server error" }` (details logged)|

Module-specific error messages are declared as injectable catalogues
(`UsersExceptions`, `AuthExceptions`) so they are easy to find and reuse.

## Adding a module

```bash
nest g module orders && nest g controller orders && nest g service orders
```

Then mirror the `users` layout: schema, repository, mapper, DTOs in
`_utils/dtos`, exceptions in `_utils/errors`. Routes are protected by default;
add `@Public()` or `@Protect(role)` as needed.
