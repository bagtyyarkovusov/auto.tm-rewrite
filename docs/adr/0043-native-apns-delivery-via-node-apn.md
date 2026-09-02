# ADR-0043: Native APNS delivery via node-apn, not firebase-admin

- **Status**: Proposed
- **Date**: 2026-09-03
- **Deciders**: AutoTM founder + AI architect

## Context

[ADR-0009](0009-notifications.md) locked the push architecture and stated that both FCM and APNS delivery would use the `firebase-admin` SDK from `apps/api` and `apps/worker`. Sprint 11 issue #275 is the first work that actually delivers native push, so it is the first time that clause meets running code.

The mobile client acquires its push token through `Notifications.getDevicePushTokenAsync()` (`apps/mobile/src/notifications/getPushToken.ts`). On iOS that returns a **native APNS device token**, not an FCM registration token. `firebase-admin`'s `messaging().send()` accepts only FCM registration tokens. Delivering to those iOS tokens through `firebase-admin` would require either:

- switching the client to `getExpoPushTokenAsync()` or an FCM-bridged token, which adds a token-exchange dependency and changes the S10 token-registration contract; or
- registering the APNS auth key with Firebase and routing iOS through FCM, which makes every iOS push depend on a Google-hosted hop.

Neither is acceptable inside the S11 slice. The first reopens a shipped contract; the second adds an external dependency to the iOS delivery path for no delivery benefit.

A second, smaller divergence: ADR-0009 wrote the transport selector as `PUSH_TRANSPORT=fcm|apns|ntfy|test`. The implemented worker enum is `test|fcm-apns|ntfy`, because FCM and APNS are selected per device platform inside one transport rather than chosen globally by an operator.

## Decision

**AutoTM delivers iOS push natively through `@parse/node-apn` and Android/Web push through `firebase-admin`, behind the single `PushPort` seam.**

- `apps/worker/src/push/adapters/FcmApnsPushTransport.ts` routes by `PushPayload.platform`: `ios` to APNS, `android` and `web` to FCM.
- `firebase-admin` is retained for FCM only. It is no longer claimed to serve APNS.
- The `fcm-apns` transport name denotes one transport covering both providers; ADR-0009's four-value selector list is superseded by the implemented `test|fcm-apns|ntfy` enum.
- Each provider owns a pure classification function mapping its wire vocabulary to `PushResult`, so retry and token-deactivation behavior is deterministic and testable without network access.
- The APNS host is selected by an explicit `APNS_PRODUCTION` variable, never derived from `APP_ENV`. EAS `internal` distribution signs iOS builds with production entitlements, so a staging deployment can legitimately hold production APNS tokens; guessing the host wrong returns `BadDeviceToken`, which would deactivate healthy devices.

This supersedes ADR-0009's "Both use `firebase-admin` SDK" clause and its `PUSH_TRANSPORT` value list. Every other ADR-0009 decision — the `PushPort` abstraction, the retry/invalid-token contract, the `ntfy` fallback remaining unimplemented, and the rejection of self-hosted-only push — stands unchanged.

## Consequences

**Positive**

- iOS push works against the token the client already registers; no change to the S10 registration contract.
- The iOS delivery path has no Google dependency, which matters for a product that must survive TM network conditions.
- Provider-specific failure vocabularies stay isolated in their own adapters and are unit-testable without credentials.

**Negative**

- Two provider SDKs to keep current in `apps/worker` instead of one.
- Two credential sets to provision and rotate (`FCM_*` service account, `APNS_*` auth key).
- `@parse/node-apn` is a community-maintained fork of the archived `node-apn`. If it stalls, the fallback is registering the APNS key with Firebase and routing iOS through FCM — a reversible change confined to `adapters/apns/`.

**Neutral**

- The Prisma model remains `FcmDevice` even though it now stores APNS tokens. Renaming needs a migration and is out of the S11 slice; recorded here so the naming drift is deliberate and visible.
