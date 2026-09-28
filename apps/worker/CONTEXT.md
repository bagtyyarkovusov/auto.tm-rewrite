# Background worker

The worker consumes queued work outside the API request path. Native direct-message push, sign-in email, and expired-account purge have implementations. Video transcoding and broad orphan cleanup are currently registered placeholders; their processors do not establish that those capabilities work.

The API owns push eligibility and history creation. The worker delivers per token and updates delivery outcomes. Android uses FCM and iOS uses direct APNS behind the push port; preserve invalid-token classification and retry behavior. Provider code existing in Git does not prove deployed credentials or real-device delivery.

Sign-in email uses Resend behind the email port and daily-send cap. Keep credential material and codes out of error/log payloads. Account purge is distinct from broad media orphan cleanup; do not remove its scheduler or privacy-preserving deletion behavior while cleaning scaffolds.

Read the queue processors and their tests for payload/retry behavior. Environment validation controls the transport; test/unconfigured transports are not production delivery evidence.

## Start here

- [Queues and composition](src/app.module.ts)
- [Push delivery and tests](src/push/application/ProcessDirectMessagePush.ts)
- [Email delivery and tests](src/email/application/SendSignInCodeEmail.ts)
- [Account purge and tests](src/jobs/PurgeExpiredAccounts.ts)
- [Transport configuration](src/env.schema.ts)
- [Push architecture](../../docs/adr/0043-native-apns-delivery-via-node-apn.md)
- [Email architecture](../../docs/adr/0055-resend-sends-sign-in-codes-from-the-worker.md)
