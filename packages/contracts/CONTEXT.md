# Shared contracts

This package owns Zod request/response schemas, derived TypeScript types, shared error/pagination definitions, and the OpenAPI exporter. Inspect the source exports to see what consumers can use. Schema presence alone does not prove a corresponding feature is wired into an app.

Runtime consumers load compiled exports from `dist`; preserve CommonJS and ESM consumers under the [runtime boundary guide](../../docs/agents/typescript-runtime.md). Do not point runtime exports at raw TypeScript to fix one consumer.

Change source schemas first and regenerate `openapi.json` using the workspace script. The generator emits JSON only. The generated document is an integration artifact, not mandatory startup reading or an independently maintained specification.

Auth behavior belongs to identity use-cases. In particular, pending admin TOTP enrollment reuses its secret until verified; a schema's response shape does not define secret-rotation policy.

## Start here

- [Public exports](src/index.ts)
- [Source schemas](src/schemas)
- [OpenAPI assembly](src/openapi.ts)
- [Generator](scripts/generate-openapi.ts)
- [Build and exports](package.json)
- [TOTP enrollment and tests](../../apps/api/src/modules/identity/application/EnrollAdminTotp.ts)
