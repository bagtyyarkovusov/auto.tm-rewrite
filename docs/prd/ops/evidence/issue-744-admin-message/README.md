# Reported Message moderation, issue #744

The governing behavior is [issue #744](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/744) and [the reported chat Message flow](../../../flows/65-admin-moderation.md#special-case-reported-chat-message). The existing Russian report table, cards and required-reason forms govern the layout. This is a local browser proof with synthetic content and a fixture API. The hosted API integration test supplies the real authorization, audit, transaction and enforcement proof.

The production build passed with `API_BASE_URL=http://127.0.0.1:17444/api/v1` and `NEXT_PUBLIC_MINIO_PUBLIC_URL=http://127.0.0.1:17444`. The standalone server ran from `apps/admin/.next/standalone/apps/admin/server.js`, with the app's static and public assets beside it, at `PORT=17445 HOSTNAME=127.0.0.1`. Playwright Core 1.58.2 drove headless Chrome with a fresh context and a synthetic session cookie. Screenshots use a 1024 × 900 viewport and include the full page.

| Criterion or state | Screenshot and observed behavior |
|---|---|
| 1: Queue label and filter | [Message queue](queue.png). Both the type column and selected filter say "Сообщение". |
| 1–2: Detail | [Reported Message](message.png). Text preserves line breaks; attachment marker, sent time and sender link are visible. The link is `/users/sender-1`; no `/users/m1` link exists. |
| 3: Successful suspension | [Sender suspended and report actioned](suspended.png). Refresh removes the mutation forms. |
| 3: Pending request | [Processing](pending.png). Suspension input and button are disabled. |
| 3: Failure | [Error and retry](failure.png). The Message and pending report remain visible; the action is available again. |
| 4: Dismissal | [Report dismissed](dismissed.png). Refresh removes the action forms. |
| 6: Deleted target and sender | [Deleted state](deleted.png). The report renders, labels both deletions, and keeps dismissal available. No sender link or suspension control exists. |
| 2: No attachment | [Text-only Message](no-attachment.png). No attachment marker. |
| Feature disabled | [Read remains available](disabled.png). Both mutation controls are absent. |
| Staff read forbidden | [Read refused](forbidden.png). No content or mutation control is shown. |

The actual Next server actions sent these requests to the fixture:

```text
POST /api/v1/admin/users/sender-1/suspend
{"reason":"Спам","reportId":"r1"}

POST /api/v1/admin/reports/r1/dismiss
{"reason":"Нарушений нет"}
```

Rendered tests separately cover escaped text, exact Message labels, filter forwarding, sender-link routing, suspension/dismissal, pending and error states, moderation disabled, and independently deleted Message and sender states. Application and route tests cover the audited narrow Conversations port, fail-closed audit storage, sender matching, resolving only the supplied report, and both audit IDs without Message text. The sign-in tests cover phone, email and reviewer phone bypass; the existing send-policy tests exercise suspended participants.

The API integration test in `AdminModerationController.e2e.spec.ts` creates a real Conversation and Message report. It refuses unauthenticated, ordinary and non-elevated staff reads; checks the read audit and `no-store` response; rejects surrounding content and storage metadata; suspends the sender; verifies report resolution and the action audit; refuses messaging and sign-in; and keeps a deleted Message/sender report readable. It runs in the hosted required `pr` check. No local Docker, emulator, simulator or native build was used.

Contracts and regenerated OpenAPI include sender and attachment information plus `REPORTED_MESSAGE_READ`. The report-detail response no longer returns the saved surrounding Message window. No schema migration, live setting change, message deletion action or Conversation browser was added.
