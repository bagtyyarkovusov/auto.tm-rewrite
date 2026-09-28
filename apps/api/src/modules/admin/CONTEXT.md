# Admin

Admin owns content reports, moderation, and audit records. Identity owns authentication/elevation and User state; Listings owns listing state. Moderation coordinates through their ports rather than reimplementing ownership rules. Inspection-interest aggregates belong to Reports.

Public report creation is authenticated but does not require admin privilege. Staff read/write paths require the admin boundary. Preserve target eligibility, self-report restrictions, pending-report reuse, and message participant checks.

Report-entry and moderation-action flags disable writes independently while leaving the supported staff reads available. An off switch must not silently disable login or audit access. Moderation writes and corresponding audit records must remain consistent.

Audit and report history intentionally survives account deletion with nullable actor/reporter relationships. Reviewer-auth audit records omit credential values. A table without an update restriction does not enforce append-only history by itself; inspect the application write paths.

## Start here

- [Module composition](admin.module.ts)
- [Moderation and report use-cases](application)
- [Moderation integration tests](presentation/AdminModerationController.e2e.spec.ts)
- [Adapters and audit persistence](infrastructure)
- [Admin browser boundary](../../../../admin/CONTEXT.md)
- [Inspection demand](../reports/CONTEXT.md)
- [Schema](../../../../../packages/db/prisma/schema.prisma)
