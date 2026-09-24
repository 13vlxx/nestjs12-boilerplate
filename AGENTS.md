# Agent guide

Conventions for working in this repository. The README explains *what* the
project does; this file is about *how* code must be written here. Follow it
over your defaults.

## Stack in one line

NestJS 12 · ESM · TypeScript strict · MongoDB/Mongoose 9 · Zod 4 +
`nestjs-zod` · Logto self-hosted (OIDC, `jose` for tokens, `@logto/api` for
the Management API) · S3 (`@aws-sdk/client-s3`) · `@nestjs/throttler` ·
`@nestjs/terminus` · pnpm · oxlint · Prettier.

## Commands

```bash
docker compose up -d --wait   # MongoDB :27018, Logto :3001/:3002, Maildev :1025/:1080, RustFS :9000/:9001
pnpm start:dev                # http://localhost:3000/api/v1, Swagger at /api/doc, Scalar at /api/doc-scalar
pnpm build && pnpm lint && pnpm format   # must all pass before you are done
pnpm seed                     # DROPS MongoDB; creates missing API resource/roles/users + roles JWT script in Logto
```

There are no automated tests in this repo (by choice). Verify changes by
building, then exercising the routes with curl or Swagger against the Docker
services. Use a throwaway `DATABASE_NAME` / `S3_BUCKET` when scripting and
clean up after yourself. Get user tokens by exchanging the PAT printed by
`pnpm seed` (see README, *Getting a token*); when scripting against Logto
itself, use a throwaway Logto (`docker compose -p <tmp> …` on other ports),
never the shared one.

The Yaak workspace in `yaak/` (directory sync) has one request per route:
add a request file when you add a route (same `folderId` as the *API*
folder, `${[ API_URL ]}` in the URL, auth inherited). Never put tokens, PATs
or app ids in those files: they belong in a private Yaak environment.

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
helpers). Infrastructure modules (`s3`, `logto`) expose a service and are
imported where needed; `AuthModule` is `@Global()`. `users` has no
repository nor schema: its data lives in Logto, read through `LogtoService`.

## Layers

- **Controller**: only delegates to the service. No logic, no mapping, no
  repository access. Every route declares its response with
  `@ZodResponse({ type: XDto })` (or `[XDto]` for arrays) and, when not 200,
  its `status`. Routes returning nothing use `@HttpCode(HttpStatus.NO_CONTENT)`
  and `Promise<void>`.
- **Service**: business logic. Methods called by *controllers* return DTOs
  (via the mapper). Methods called by *other modules* return documents or
  records (`LogtoUser`), because callers need ids and raw fields. Throw from the
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
- Nullable fields: put the `.meta()` on the inner schema, **before**
  `.nullable()` (`z.string().meta({ example }).nullable()`). A bare nullable
  primitive becomes `type: [T, "null"]`, which `@nestjs/swagger` renders as
  an array of `T`; with a keyword on the inner schema, Zod emits `anyOf`,
  which `cleanupOpenApiDoc` turns into `nullable: true`.
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

- Logto owns sign-up, sign-in, passwords, emails, MFA. The API has no auth
  route and must not store credentials or add one.
- **Every route is protected by default** (`JwtAuthGuard` as `APP_GUARD`):
  it verifies the Bearer token locally with `jose` against Logto's JWKS
  (issuer `<LOGTO_ENDPOINT>/oidc`, audience `LOGTO_API_RESOURCE`). Never call
  Logto from the guard: one HTTP call per request is what this design avoids.
  `@Public()` opts out.
- Authorization = Logto user roles, read from the access token's `roles`
  claim (added by the *Custom JWT* script that `pnpm seed` installs). New
  role: add it to `UserRoleEnum` and `seedRoles`, run `pnpm seed`, then
  `@Protect(UserRoleEnum.X)` (any of the listed roles). Never fetch roles
  from the Management API in the guard.
- Every non-public route declares its access explicitly: `@Protect()` (any
  authenticated user) or `@Protect(UserRoleEnum.X, …)`. Roles on a route
  replace the controller's; a bare `@Protect()` sets no metadata, so it
  never loosens a controller-level restriction.
- `@ConnectedUser() user: AuthUser` gives `{ id, roles }` from the token.
  Load the Logto user (`UsersService.findById`) only in routes that need it.
- Every route has `@ApiOperation({ summary })`, placed **below** `@Protect`:
  `@Protect` appends `(ALL)` / `(ADMIN)` to that summary when it runs, and
  decorators apply bottom-up. Don't write the label by hand.
- `@Public()` / `@Protect()` document access themselves (no bearer / `401` /
  `403` with the roles); don't hand-write those responses and don't
  post-process the OpenAPI document (only `cleanupOpenApiDoc`).

## Logto

- Management API calls go through `LogtoService` (typed `openapi-fetch`
  client from `@logto/api`, injected by the `LOGTO_MANAGEMENT_API` token).
  Wrap calls with `unwrap` / `unwrapOrNull` (`logto-response.utils.ts`); add
  a small method per use case, like a repository.
- Types come from that client: `LogtoUser` is inferred from
  `LogtoService.findUserByIdOrNull`; don't hand-write Logto shapes.
- `customData` is merged on `PATCH`, can be edited outside the API and is
  untyped: describe it with a Zod schema (`user-custom-data.type.ts`), use
  `.catch()` so bad data degrades instead of 500ing, never put permissions
  in it, and check S3 keys belong to the user before presigning/deleting.
- Business documents reference users by Logto id (string, no populate).

## Files

- No `files` collection. A stored file is an embedded `S3File`
  (`@Prop({ type: S3FileSchema }) picture: S3File | null`) on the document
  that owns it, or a `storedS3FileSchema` entry in a Logto user's
  `customData`.
- `S3Service.uploadFile(file, folder)` returns the `S3File`; folders are
  named in `S3KeysMapper` (one method per use case — never build a key
  string inside a service). Delete the previous object when replacing.
- Expose files to clients through `S3Mapper.toGetS3FileDto` (presigned URL),
  never the raw key.
- New MIME type = add it to `MimeTypeEnum` **and** its signature in
  `magic-bytes.ts`.

## Emails

Auth emails (verification codes, password reset, MFA) are sent by Logto
through its SMTP connector (Maildev locally). There is no mailer in the API
yet; if one is needed, create it as an infrastructure module (client built
with `useFactory`, token in `<feature>.constants.ts`).

## Dependency injection & ESM gotchas

- Infrastructure clients (S3, Logto Management API, JWKS) are created in the module with a
  `useFactory` provider and injected by token. Injection tokens live in
  `<feature>.constants.ts`, **never** in the module file: a service importing
  its own module creates an ESM cycle that fails at startup.
- Relative imports end with `.js` (even for `.ts`/`.tsx` sources).
- Types used in decorated signatures (controller params, constructor params)
  must be `import type` when they are only types (`AuthUser`, DTO classes
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
  dev-only placeholders; the Logto M2M credentials stay empty there).
- Reintroduce passport, `@nestjs/jwt`, bcrypt or a local users collection
  for authentication.
- Use `any`; reach for `unknown` + a Zod parse.
- Write tests or test tooling unless explicitly asked.
