# Reported Profile Photo removal — issue #739

Captured on 2026-10-08 from the admin production build at `7b29dc87`.
The issue supplies the UI delta; the existing Russian report cards and action
forms supply the layout and tokens. This is a local browser proof with a fixture
API and synthetic Profile Photo, not a staging or production moderation run.

The build ran with `API_BASE_URL=http://127.0.0.1:17390/api/v1` and
`NEXT_PUBLIC_MINIO_PUBLIC_URL=http://127.0.0.1:17390`. Both `next start` and the
deployment's standalone server (`PORT=17392 HOSTNAME=127.0.0.1
API_BASE_URL=http://127.0.0.1:17390/api/v1 node
apps/admin/.next/standalone/apps/admin/server.js`, with static/public assets
copied beside it) passed the same Playwright 1.58.2 smoke in headless Chrome.
Screenshots below come from the standalone run at a 1024 × 900 viewport.

| Issue criterion / state | Captured UI and observed behavior |
|---|---|
| 1: Profile Photo set | [Current photo and removal control](photo-set.png); image loaded successfully. |
| 1: Only Assigned Avatar | [No extra photo block or removal control](no-photo.png). |
| 2: Confirmation | [Reason and explicit confirmation/cancel controls](confirmation.png). Clicking the initial button did not remove the photo. |
| 2: Success | [Assigned Avatar and actioned report](success.png); photo and action controls gone after server refresh. |
| 3: Failure | [Error with original photo and pending report](failure.png). |
| 3: Flag disabled | [Photo readable, moderation actions hidden](disabled.png). |
| 3: Staff read forbidden | [Error, no removal control](forbidden.png). |
| Pending request | [Input, confirmation and cancel disabled](pending.png); completion then refreshed to actioned. |

The actual Next.js server action issued exactly one request to the fixture:

```text
POST /api/v1/admin/users/u1/remove-photo
{"reason":"Неприемлемое фото","reportId":"r1"}
```

Rendered Vitest tests separately cover photo/no-photo, confirmation, cancellation,
reason validation, success, errors, feature-disabled and forbidden reads,
config failure, resolved reports, and ineligible targets. The focused suite passed
45 admin tests and 13 API report-detail tests. Red evidence remains in pushed
commits `398529ff` and `ac80d9d5`, and the PR Execution state records commands and
failure reasons.

The removal route and transaction are unchanged. The report-detail reader now
exposes optional `avatarKey` and `avatarIndex` fields that its Identity read
already had; these are the additive read-contract exception to criterion 6's
“no API change” wording. No schema migration or live configuration changed.
