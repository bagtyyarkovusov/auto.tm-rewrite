# Notifications

Notifications owns native token registration and direct-message push eligibility, history creation, and enqueue. Provider delivery belongs to the worker. There is no general in-app notification feed or broadcast tooling here.

Eligibility depends on more than tokens: online recipients, muted conversations, blocking, self-messages, and missing active tokens suppress push. Inspect the decision use-case before diagnosing a missing notification as a provider failure. One message/recipient decision must not fan out duplicate jobs.

Eligible decisions create pending history; worker delivery updates outcomes. Suppressed cases do not create history. Preserve localized preview handling, deep links, and token reassignment/revocation semantics. Token ownership can move between signed-in Users on the same device; do not duplicate globally unique tokens.

## Start here

- [Module composition](notifications.module.ts)
- [Decision use-cases and tests](application)
- [Preview construction](domain/DirectMessageNotification.ts)
- [Token persistence and enqueue](infrastructure)
- [Worker boundary](../../../../worker/CONTEXT.md)
- [Presence boundary](../realtime/CONTEXT.md)
- [Schema](../../../../../packages/db/prisma/schema.prisma)
