# Agent guide

Conventions for working in this repository. The README explains *what* the
project does; this file is about *how* code must be written here. Follow it
over your defaults.

## Stack in one line

NestJS 12 · ESM · TypeScript strict · MongoDB/Mongoose 9 · Zod 4 +
`nestjs-zod` · Passport JWT (access + refresh, Bearer) · bcrypt · nodemailer +
React Email · S3 (`@aws-sdk/client-s3`) · `@nestjs/throttler` ·
`@nestjs/terminus` · pnpm · oxlint · Prettier.

## Commands

```bash
docker compose up -d --wait   # MongoDB :27017, Maildev :1025/:1080, RustFS :9000/:9001
pnpm start:dev                # http://localhost:3000/api/v1, Swagger at /api/doc
pnpm build && pnpm lint && pnpm format   # must all pass before you are done
pnpm seed                     # DROPS the database, recreates indexes, inserts src/seed/seed.data.ts
```

There are no automated tests in this repo (by choice). Verify changes by
building, then exercising the routes with curl or Swagger against the Docker
services. Use a throwaway `DATABASE_NAME` / `S3_BUCKET` when scripting and
clean up after yourself.

## Module layout

Every feature module mirrors `src/users`. Copy its shape, don't invent one:

```
<feature>/
├── _utils/
│   ├── dtos/requests/<name>.dto.ts      # Zod schema + createZodDto
│   ├── dtos/responses/<name>.dto.ts
│   ├── errors/<feature>-exceptions.types.ts
│   ├── types/<name>.enum.ts | <name>.type.ts
│   ├── decorators/, schemas/, ...        # only if needed
│   └── <feature>.constants.ts
├── <feature>.controller.ts
├── <feature>.service.ts
├── <feature>.repository.ts
├── <feature>.mapper.ts
├── <feature>.schema.ts
└── <feature>.module.ts
```

Cross-cutting code lives in `src/_utils/` (config, filters, regex, schemas,
helpers). Infrastructure modules (`s3`, `emails`, `encryption`) expose a
service and are imported where needed; `AuthModule` is `@Global()`.

## Layers

- **Controller**: only delegates to the service. No logic, no mapping, no
  repository access. Every route declares its response with
  `@ZodResponse({ type: XDto })` (or `[XDto]` for arrays) and, when not 200,
  its `status`. Routes returning nothing use `@HttpCode(HttpStatus.NO_CONTENT)`
  and `Promise<void>`.
- **Service**: business logic. Methods called by *controllers* return DTOs
  (via the mapper). Methods called by *other modules* return documents
  (`UserDocument`), because callers need `_id`, hashes, etc. Throw from the
  module's exceptions catalogue; never `new XException()` inline.
- **Repository**: the only place that touches the Mongoose model. Small,
  explicit methods (`findByEmailOrNull`, `updatePassword`…). `OrNull` suffix
  when a method can return `null`; otherwise it throws `X_NOT_FOUND` via
  `.orFail()`.
- **Mapper**: `Document → DTO`. `async` only when it must presign URLs. Provide
  the plural (`toGetXDtos`) next to the singular.
- **Exceptions**: `@Injectable() class XExceptions { readonly CODE = new HttpException('CODE') }`.
  Messages are `UPPER_SNAKE` codes the client can match on. Use 404 rather
  than 403 when revealing existence would leak information.

Prefer arrow-function properties for one-liners (`findAll = () => …`) and
regular methods when there is a body.

## Validation & typing — Zod everywhere

- Every request/response shape is a Zod schema wrapped with `createZodDto`.
  Export the schema too when it will be composed (`.partial()`, `.extend()`).
- Request bodies use `z.strictObject` (unknown keys → 400). Add
  `.meta({ example, description })` on fields so Swagger is usable.
- Path params: a DTO with `objectIdSchema` (`src/_utils/schemas`) and
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
- Types are inferred (`z.infer`, `HydratedDocument<X>`); don't hand-write
  interfaces that duplicate a schema.

## Auth

- **Every route is protected by default** (`JwtAuthGuard` as `APP_GUARD`).
  `@Public()` opts out; `@Protect(UserRoleEnum.ADMIN, …)` restricts to roles;
  `@RefreshTokenProtected()` authenticates with the refresh token.
- `@ConnectedUser() user: UserDocument` gives the authenticated user, loaded
  from the DB on every request.
- Access tokens are short-lived and stateless; refresh tokens are rotated and
  stored as SHA-256 on the user (single device). One-shot tokens (email
  verification, password reset) go through `token.utils.ts` and
  `ActionToken { hash, expiresAt }`. Never bcrypt a token — bcrypt truncates
  at 72 bytes; bcrypt is for passwords only, via `EncryptionService`.
- Swagger summaries get `(ALL)` / `(ADMIN)` automatically from the same
  metadata the guard uses (`annotate-access.ts`); don't write them by hand.

## Files

- No `files` collection. A stored file is an embedded `S3File`
  (`@Prop({ type: S3FileSchema }) picture: S3File | null`) on the document
  that owns it.
- `S3Service.uploadFile(file, folder)` returns the `S3File`; folders are
  named in `S3KeysMapper` (one method per use case — never build a key
  string inside a service). Delete the previous object when replacing.
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
  must be `import type` when they are only types (`UserDocument`, DTO classes
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
  `@nestjs-modules/mailer`, or Mongoose `populate` for files.
- Use cookies for auth, or put secrets in the repo (`.env.development` holds
  dev-only placeholders).
- Use `any`; reach for `unknown` + a Zod parse.
- Write tests or test tooling unless explicitly asked.
