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
| Emails            | nodemailer + React Email templates (Maildev locally)                   |
| Files             | S3-compatible storage (RustFS locally), multipart upload, presigned reads|
| Rate limiting     | `@nestjs/throttler`                                                    |
| Health            | `@nestjs/terminus` (MongoDB ping)                                      |
| Docs              | Swagger UI at `/api/doc` (disabled in production)                      |
| Tooling           | oxlint, Prettier, Taskfile                                             |

## Getting started

```bash
pnpm install
docker compose up -d --wait   # MongoDB, Maildev, RustFS (see below)
pnpm seed                     # drops the DB and inserts the users from src/seed/seed.data.ts
pnpm start:dev                # http://localhost:3000/api/v1 — Swagger at /api/doc
```

### Local services (`docker-compose.yml`)

| Service | Image                | Ports                                | Notes                                         |
| ------- | -------------------- | ------------------------------------ | --------------------------------------------- |
| MongoDB | `mongo:8.3`          | `27017`                              |                                               |
| Maildev | `maildev/maildev`    | `1025` SMTP, `1080` inbox UI         | Catches every email sent by the API           |
| RustFS  | `rustfs/rustfs`      | `9000` S3 API, `9001` console        | S3-compatible storage, `rustfsadmin` / `rustfsadmin` |

Data lives in named volumes; `docker compose down -v` (or `task reset`) wipes it.
The API itself runs on the host.

Seeded accounts:

| Role  | Email                  | Password     |
| ----- | ---------------------- | ------------ |
| admin | `admin@example.com`    | `Admin1234!` |
| user  | `john.doe@example.com` | `Passw0rd!`  |

### Scripts

| Command           | Description                                            |
| ----------------- | ------------------------------------------------------ |
| `task up`         | Start MongoDB, Maildev and RustFS in Docker            |
| `task down`       | Stop them (`task reset` also deletes their data)       |
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
| `CLIENT_URL`                  | —       | Front-end base URL, used to build links in emails      |
| `DATABASE_URL`                | —       | MongoDB connection string                              |
| `DATABASE_NAME`               | —       |                                                        |
| `JWT_ACCESS_TOKEN_SECRET`     | —       | At least 32 characters                                 |
| `JWT_ACCESS_TOKEN_EXPIRATION` | `900`   | Seconds. Short: an access token cannot be revoked      |
| `JWT_REFRESH_TOKEN_SECRET`    | —       | At least 32 characters, different from the access one  |
| `JWT_REFRESH_TOKEN_EXPIRATION`| `604800`| Seconds (7 days)                                       |
| `THROTTLE_TTL`                | `60000` | Rate-limit window, milliseconds                        |
| `THROTTLE_LIMIT`              | `100`   | Max requests per window per IP                         |
| `MAIL_HOST` / `MAIL_PORT`     | —       | SMTP server (Maildev: `localhost` / `1025`)            |
| `MAIL_SECURE`                 | `false` | TLS on connect                                         |
| `MAIL_USER` / `MAIL_PASSWORD` | —       | Optional SMTP auth                                     |
| `MAIL_FROM`                   | —       | e.g. `"My App <no-reply@example.com>"`                 |
| `S3_ENDPOINT`                 | —       | e.g. `http://localhost:9000` (RustFS) or AWS endpoint  |
| `S3_REGION`                   | `us-east-1` |                                                    |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | —   |                                                        |
| `S3_BUCKET`                   | —       | Created at startup if missing                          |
| `S3_FORCE_PATH_STYLE`         | `true`  | `true` for RustFS/MinIO, `false` for AWS               |

Config is consumed through `ConfigService<EnvironmentVariables, true>` and is
fully typed: `config.get<JwtConfig>('JWT').ACCESS_TOKEN_SECRET`.

## Project layout

```
src/
├── _utils/            # cross-cutting: env config, filters, regex
├── auth/              # register / login, JWT strategy, guard, decorators
├── encryption/        # password hashing (see below)
├── health/            # GET /health
├── emails/            # nodemailer + React Email templates
├── s3/                # S3 client, FormDataRequest/uploadedFile helpers, S3File sub-document
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

### Email verification & password reset

| Route                            | Auth   | Effect                                                              |
| -------------------------------- | ------ | ------------------------------------------------------------------- |
| `POST /auth/register`            | public | Creates the user and sends a verification email                     |
| `POST /auth/verify-email`        | public | `{ token }` → marks the email as verified                           |
| `POST /auth/resend-verification` | access | Sends a new verification email (409 if already verified)            |
| `POST /auth/forgot-password`     | public | `{ email }` → sends a reset email. Always 204, even for unknown emails |
| `POST /auth/reset-password`      | public | `{ token, password }` → sets the password, revokes the refresh token |

Tokens are random 256-bit strings sent in the email link
(`CLIENT_URL/verify-email?token=…`, `CLIENT_URL/reset-password?token=…`),
stored as SHA-256 on the user with an expiry (24 h / 1 h, see
[auth.constants.ts](src/auth/_utils/auth.constants.ts)) and single-use.
Login is not blocked for unverified emails; `GetUserDto.isEmailVerified`
lets the client decide what to gate.

## Emails

`EmailsService` ([src/emails](src/emails)) wraps nodemailer and renders
[React Email](https://react.email) templates (`src/emails/templates/*.tsx`) to
HTML + plain text. Locally, everything lands in Maildev at
<http://localhost:1080>. To add an email: write a template function returning
JSX, add a `sendXxx` method on `EmailsService`.

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
document — no `files` collection, no references. `S3Mapper.toGetS3FileDto`
turns it into `{ url, fileName, mimeType, size }` with a presigned URL
(15 min).

`PUT /users/me/profile-picture` is the shipped example: single required
image, previous object deleted on replace, `GetUserDto.profilePictureUrl` as
a presigned URL or `null`. `objectIdSchema`
([object-id.schema.ts](src/_utils/schemas/object-id.schema.ts)) is there for
`@Param()` DTOs so a malformed id yields a 400 instead of a Mongoose
`CastError`.

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
| Verification token invalid   | 400    | `{ message: "INVALID_VERIFICATION_TOKEN" }`           |
| Reset token invalid/expired  | 400    | `{ message: "INVALID_RESET_TOKEN" }`                  |
| Email already verified       | 409    | `{ message: "EMAIL_ALREADY_VERIFIED" }`               |
| Upload rejected (type/size)  | 400    | `{ message: "Validation failed", errors: [...] }`     |
| Upload over multer limit     | 413    | `{ message: "File too large" }`                        |
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
