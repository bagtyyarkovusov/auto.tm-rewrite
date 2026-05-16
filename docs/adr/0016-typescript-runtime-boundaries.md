# ADR-0016: TypeScript runtime boundaries for workspace packages

- **Status**: Accepted
- **Date**: 2026-05-17

## Context

The API crashed in watch mode after `packages/db/src/index.ts` changed from:

```ts
export { PrismaService } from "./prisma.service";
```

to:

```ts
export { PrismaService } from "./prisma.service.js";
```

`tsc --noEmit` still passed, but Node 24 loaded `@auto-tm/db` through the package export `./src/index.ts` and then looked for `packages/db/src/prisma.service.js`, which does not exist.

Context7 checks against current TypeScript and Node docs confirmed the core mismatch:

- Node ESM requires fully specified relative import paths and resolves `./x.js` as exactly `x.js`.
- TypeScript normally preserves import specifier strings during emit.
- Raw TypeScript source exported from workspace packages can pass typecheck while failing under Node runtime resolution.

## Decision

Runtime-shared workspace packages are built packages:

- `@auto-tm/db` exports `dist/src/index.js` and `dist/src/index.d.ts`.
- `@auto-tm/contracts` exports `dist/index.js` and `dist/index.d.ts`.
- `@auto-tm/db` build runs `prisma generate` first because `packages/db/generated/` is ignored.
- The Prisma generator uses `moduleFormat = "cjs"` so generated client code is compatible with the DB package's CommonJS build.
- API and worker direct `dev` scripts build those packages before starting watch mode.
- Mobile direct `dev` builds `@auto-tm/contracts` before starting Expo.
- Root Turbo `build`, `test`, and `typecheck` rely on package graph dependencies; direct app checks must build runtime-shared packages first.
- `pnpm check:runtime-imports` verifies that Node can load the runtime package exports.

`packages/ui` remains source-exported because it is bundler-only and consumed by Next/Metro, not by raw Node backend runtime.

`apps/sms-gateway` remains true ESM and keeps `.js` relative import specifiers in TypeScript source.

## Consequences

### Positive

- API and worker no longer execute raw shared-package TypeScript through Node 24.
- Runtime package import failures are caught by a small deterministic check.
- Agents have one documented package-boundary rule instead of guessing from isolated TypeScript errors.

### Negative / accepted costs

- Backend package source changes require a build before consumers see them.
- Direct app dev commands spend extra time rebuilding `@auto-tm/db` and/or `@auto-tm/contracts`.
- `@auto-tm/contracts` emits a nested `dist/package.json` so its CommonJS output is not interpreted as ESM under the root package's `"type": "module"`.
- Prisma generator module format is coupled to the DB package build format. Changing either requires updating both together.

### Neutral

- Build output remains ignored by git.
- This does not change API behavior, database schema, or contract schema content.

## Alternatives considered

- **Keep exporting raw TypeScript and use `.ts` import specifiers** — rejected because generated Prisma TypeScript imports use emitted-JS-style `.js` specifiers internally and raw Node execution remains fragile.
- **Convert all backend workspaces to ESM/NodeNext** — rejected as too broad for the current NestJS CommonJS apps and not required to fix the runtime boundary.
- **Rely on typecheck only** — rejected because the observed failure passed typecheck.

## References

- `docs/agents/typescript-runtime.md`
- ADR-0002 (Technology stack)
- ADR-0003 (Monorepo with Turborepo + pnpm workspaces)
- ADR-0011 (Latest-stable version uplift)
