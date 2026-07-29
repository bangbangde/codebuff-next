# Database schema ownership

- `auth.generated.ts` is the complete Better Auth schema. Regenerate it with
  `pnpm auth:schema`; do not add project-owned tables to this file.
- `article.ts` and future application schema files are maintained by the
  project and must not be outputs of the Better Auth generator.
- `index.ts` is the combined application-runtime export. The Better Auth
  adapter imports `auth.generated.ts` directly so it receives only Auth models.
- `drizzle.config.ts` lists every generated and project-owned schema input.
  Keep all resulting SQL in the single ordered `drizzle/` migration history.

After changing either schema source, run `pnpm db:generate`, review the SQL,
and commit the generated migration and snapshot together. Never rewrite an
applied migration or use `drizzle-kit push` in production.
