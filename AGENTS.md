# Agent guide

Conventions for working in this repository. The README explains *what* the
project does; this file is about *how* code must be written here. Follow it
over your defaults.

## Stack in one line

NestJS 12 · ESM · TypeScript strict · PostgreSQL 18 / Prisma 7 (`@prisma/adapter-pg`) · Zod 4 +
`nestjs-zod` · Passport JWT (access + refresh, Bearer) · bcrypt · nodemailer +
React Email · S3 (`@aws-sdk/client-s3`) · `@nestjs/throttler` ·
`@nestjs/terminus` · pnpm · oxlint · Prettier.

## Commands

```bash
docker compose up -d --wait   # Postgres :5432, Maildev :1025/:1080, RustFS :9000/:9001
pnpm start:dev                # http://localhost:3000/api/v1, Swagger at /api/doc
pnpm build && pnpm lint && pnpm format   # must all pass before you are done
pnpm db:migrate --name <name> # after editing prisma/schema.prisma: writes + applies a migration
pnpm seed                     # applies migrations, TRUNCATES every table, inserts src/seed/seed.data.ts
```

There are no automated tests in this repo (by choice). Verify changes by
building, then exercising the routes with curl or Swagger against the Docker
services. Use a throwaway database (`DATABASE_URL=…/tmp_db`, then
`pnpm db:deploy`) and `S3_BUCKET` when scripting, and drop them afterwards.

## Module layout

Every feature module mirrors `src/users`. Copy its shape, don't invent one:

```
<feature>/
├── _utils/
│   ├── dtos/requests/<name>.dto.ts      # Zod schema + createZodDto
│   ├── dtos/responses/<name>.dto.ts
│   ├── errors/<feature>-exceptions.types.ts
│   ├── types/<model>.type.ts             # Prisma include + Record/Input types
│   ├── types/<name>.enum.ts              # re-export of a Prisma enum
│   ├── decorators/, schemas/, ...        # only if needed
│   └── <feature>.constants.ts
├── <feature>.controller.ts
├── <feature>.service.ts
├── <feature>.repository.ts
├── <feature>.mapper.ts
└── <feature>.module.ts
```

The model itself lives in `prisma/schema.prisma`.

Cross-cutting code lives in `src/_utils/` (config, filters, regex, schemas,
helpers). Infrastructure modules (`prisma`, `s3`, `emails`, `encryption`)
expose a service and are imported where needed; `AuthModule` is `@Global()`.

## Layers

- **Controller**: only delegates to the service. No logic, no mapping, no
  repository access. Every route declares its response with
  `@ZodResponse({ type: XDto })` (or `[XDto]` for arrays) and, when not 200,
  its `status`. Routes returning nothing use `@HttpCode(HttpStatus.NO_CONTENT)`
  and `Promise<void>`.
- **Service**: business logic. Methods called by *controllers* return DTOs
  (via the mapper). Methods called by *other modules* return records
  (`UserRecord`), because callers need `id`, hashes, etc. Throw from the
  module's exceptions catalogue; never `new XException()` inline.
- **Repository**: the only place that touches `PrismaService`. Small,
  explicit methods (`findByEmailOrNull`, `updatePassword`…) taking ids, not
  records, and always passing the feature's `include`. `OrNull` suffix when a
  method can return `null`; otherwise it throws `X_NOT_FOUND` itself (not
  `findUniqueOrThrow`, whose P2025 would become a 500). A change that must be
  atomic is one nested write (or `$transaction`), never several calls.
- **Mapper**: `Record → DTO`. `async` only when it must presign URLs. Provide
  the plural (`toGetXDtos`) next to the singular.
- **Exceptions**: `@Injectable() class XExceptions { readonly CODE = new HttpException('CODE') }`.
  Messages are `UPPER_SNAKE` codes the client can match on. Use 404 rather
  than 403 when revealing existence would leak information.

Prefer arrow-function properties for one-liners (`findAll = () => …`) and
regular methods when there is a body.

## Prisma

- `prisma/schema.prisma` is the source of truth. Tables are `@@map`ped to
  plural snake_case, ids are `String @id @default(uuid(7)) @db.Uuid`. Change
  it, then `pnpm db:migrate --name <what>` and commit the migration folder.
  Never edit an applied migration.
- The client is generated into `src/_generated/prisma` (gitignored, rebuilt by
  `postinstall` / `pnpm build` / `pnpm db:generate`). Import from
  `…/_generated/prisma/client.js` (or `enums.js`), never from
  `@prisma/client`, and never edit it.
- Inject `PrismaService` (from `PrismaModule`); never `new PrismaClient()`.
- Row types are derived, not written. Per model, in
  `<feature>/_utils/types/<model>.type.ts`:

  ```ts
  export const userInclude = {
    profilePicture: true,
  } as const satisfies Prisma.UserInclude;

  export type UserRecord = Prisma.UserGetPayload<{
    include: typeof userInclude;
  }>;

  export type UserInput = Pick<Prisma.UserCreateInput, 'firstName' | …>;
  ```

  Every repository read/write passes `include: userInclude` so it returns a
  `UserRecord`. A different shape = a second named include/type in the same
  file (`actionTokenInclude = { user: { include: userInclude } }`).
- Enums are declared in the schema with an `Enum` suffix and a snake_case
  `@@map` (`enum UserRoleEnum { … @@map("user_role") }`), then re-exported
  from `<feature>/_utils/types/<name>.enum.ts`. Use them directly in Zod
  (`z.enum(UserRoleEnum)`).
- Postgres text comparison is case-sensitive: normalise values like emails
  in the repository, on write and on lookup.
- `PrismaExceptionFilter` maps P2002 (unique constraint) to
  `409 DUPLICATE_KEY`; every other Prisma error is a logged 500.

## Validation & typing — Zod everywhere

- Every request/response shape is a Zod schema wrapped with `createZodDto`.
  Export the schema too when it will be composed (`.partial()`, `.extend()`).
- Request bodies use `z.strictObject` (unknown keys → 400). Add
  `.meta({ example, description })` on fields so Swagger is usable.
- Path params: a DTO with `uuidSchema` (`src/_utils/schemas`) and
  `@Param() { id }: XParamsDto` — never a bare `@Param('id') id: string`.
- Multipart: `@FormDataRequest({ files: [{ name, maxCount }], maxFileSize })`
  on the route and `uploadedFile({ mimeTypes, maxSize })` in the DTO. Files
  arrive as web `File` objects in `@Body()`, typed by their **magic bytes**.
  Text fields in multipart are strings: use `z.coerce.number()` /
  `z.stringbool()`. Never `@UploadedFile`, `ParseFilePipe`, `nestjs-form-data`
  or `class-validator`.
- Environment: add new variables to the Zod schema in
  `src/_utils/config/env.config.ts` (typed section + mapping in `validateEnv`)
  and to `.env.development`. Read them through
  `ConfigService<EnvironmentVariables, true>` — never `process.env`.
- Types are inferred (`z.infer`, `Prisma.XGetPayload`); don't hand-write
  interfaces that duplicate a schema.

## Auth

- **Every route is protected by default** (`JwtAuthGuard` as `APP_GUARD`).
  `@Public()` opts out; `@Protect(UserRoleEnum.ADMIN, …)` restricts to roles;
  `@RefreshTokenProtected()` authenticates with the refresh token.
- `@ConnectedUser() user: UserRecord` gives the authenticated user, loaded
  from the DB on every request.
- Access tokens are short-lived and stateless; refresh tokens are rotated and
  stored as SHA-256 on the user (single device). One-shot tokens (email
  verification, password reset) go through `token.utils.ts` and the
  `action_tokens` table (one row per user and `ActionTokenTypeEnum`, looked up
  by hash, deleted when consumed). Never bcrypt a token — bcrypt truncates
  at 72 bytes; bcrypt is for passwords only, via `EncryptionService`.
- Swagger summaries get `(ALL)` / `(ADMIN)` automatically from the same
  metadata the guard uses (`annotate-access.ts`); don't write them by hand.

## Files

- A stored file is one row of `s3_files`, owned through a nullable, unique
  FK on the owning model
  (`profilePicture S3File? @relation("UserProfilePicture", fields: [profilePictureId], …, onDelete: SetNull)`).
  Include the relation in the owner's `include`.
- `S3Service.uploadFile(file, folder)` returns an `S3FileInput`; the owner's
  repository writes it with a nested `{ upsert: { create, update } }` and
  removes it with `{ delete: true }`. Folders are named in `S3KeysMapper`
  (one method per use case — never build a key string inside a service).
  Delete the previous S3 object when replacing.
- Expose files to clients through `S3Mapper.toGetS3FileDto` (presigned URL),
  never the raw key.
- New MIME type = add it to `MimeTypeEnum` **and** its signature in
  `magic-bytes.ts`.

## Emails

One template function per email in `src/emails/templates/*.template.tsx`
(returns JSX built on `LayoutTemplate`), one `sendXxx(user, …)` method on
`EmailsService` that builds links from `CLIENT_URL`. Sending is awaited in
the request; there is no queue.

## Dependency injection & ESM gotchas

- Infrastructure clients (S3, SMTP) are created in the module with a
  `useFactory` provider and injected by token. Injection tokens live in
  `<feature>.constants.ts`, **never** in the module file: a service importing
  its own module creates an ESM cycle that fails at startup.
- Relative imports end with `.js` (even for `.ts`/`.tsx` sources).
- Types used in decorated signatures (controller params, constructor params)
  must be `import type` when they are only types (`UserRecord`, DTO classes
  are fine as values). The compiler error is TS1272.
- No `__dirname`; use `import.meta.dirname` if ever needed.

## Style

- Comments only for genuine gotchas (security pitfalls, library quirks). No
  JSDoc on ordinary methods, no "what this does" comments.
- Names: `kebab-case` files with a role suffix (`.dto.ts`, `.enum.ts`,
  `.constants.ts`, `.decorator.ts`, `-exceptions.types.ts`); `PascalCase`
  classes; enums end with `Enum`; constants `UPPER_SNAKE`.
- Keep pinned image tags in `docker-compose.yml`; no `latest`.
- Update the README when behaviour, env vars or routes change.

## Do not

- Add `class-validator`, `class-transformer`, `nestjs-form-data`,
  `@nestjs-modules/mailer`, or another ORM / query builder next to Prisma.
- Hand-write an interface or class for a row, or commit `src/_generated`.
- Use cookies for auth, or put secrets in the repo (`.env.development` holds
  dev-only placeholders).
- Use `any`; reach for `unknown` + a Zod parse.
- Write tests or test tooling unless explicitly asked.
