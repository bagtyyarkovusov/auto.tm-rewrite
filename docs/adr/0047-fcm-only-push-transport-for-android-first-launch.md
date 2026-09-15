# ADR-0047: FCM-only push transport for the Android-first launch window

- **Status**: Accepted
- **Date**: 2026-09-16
- **Deciders**: AutoTM founder + AI architect

## Context

[ADR-0043](0043-native-apns-delivery-via-node-apn.md) fixed the worker's push
transport selector at `test | fcm-apns | ntfy`, where `fcm-apns` is one transport
covering both providers and selecting between them per device platform.
`apps/worker/src/env.schema.ts` enforces that as all-or-nothing: choosing
`fcm-apns` requires all eight of `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`,
`FCM_PRIVATE_KEY`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`,
`APNS_PRIVATE_KEY` and `APNS_PRODUCTION`, or the worker fails at boot.

That was the right shape while both stores were being approached together. On
2026-09-16 the founder set a different sequence: Apple Developer Program
enrolment begins **2026-10-12**, and until then the sole launch target is
**Google Play**. The consequence is recorded in the
[S11 retro](../prd/sprints/sprint-11-railway-deployment-retro.md) and verified
against the real schema: production holds live, proven FCM credentials and
`APNS_BUNDLE_ID`/`APNS_PRODUCTION`, but the three Apple-issued values cannot
exist before October, so the worker cannot boot at all.

```
boots with Android-only credentials: false
  APNS_KEY_ID      : required when PUSH_TRANSPORT=fcm-apns
  APNS_TEAM_ID     : required when PUSH_TRANSPORT=fcm-apns
  APNS_PRIVATE_KEY : required when PUSH_TRANSPORT=fcm-apns
```

The worker is third in the promotion order, so this is not a degraded-push
problem — it blocks the production promotion itself, and with it S11-12
([#282](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/282)) and
S11-13 ([#283](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/283)).

The two existing transports that boot without Apple credentials are both wrong
here. `test` is rejected outright when `APP_ENV=production` because it delivers
nothing. `ntfy` boots but resolves to `UnconfiguredPushTransport`, which fails
**every** send — including the Android sends that have working credentials — so
shipping it would mean launching on Google Play with no push at all.

## Decision

**Add a fourth transport value, `fcm`, that requires only the three `FCM_*`
variables and delivers Android and Web push through FCM. `fcm-apns` is not
modified.**

- `PUSH_TRANSPORT` becomes `test | fcm | fcm-apns | ntfy`.
- `fcm` requires exactly `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL` and
  `FCM_PRIVATE_KEY`, validated at boot on the same fail-closed terms as
  `fcm-apns`, including PEM parsing of `FCM_PRIVATE_KEY`.
- `fcm` reuses `FcmApnsPushTransport` — the same routing rule, the same wire
  payload, the same `deepLink` contract — with the APNS side supplied by
  `UnprovisionedApnsSender`, which returns `PERMANENT` and never touches a
  network. An iOS device token under `fcm` therefore fails loudly and is
  recorded in `NotificationHistory.deliveryDetails` with a cause naming the
  transport.
- An iOS token is **not** rerouted through FCM. ADR-0043 rejected the
  Google-hosted APNS hop on the merits, and the client registers native APNS
  tokens that `firebase-admin` cannot accept anyway.
- iOS tokens are **not** treated as `INVALID_TOKEN`. That reason deactivates the
  device row; a missing server credential is not evidence that a device is dead,
  and the rows must survive intact into the `fcm-apns` era.
- Moving to `fcm-apns` stays a variable change plus a redeploy. `fcm` is the
  configuration for the Android-only window, not a replacement for the
  both-platform transport.

This supersedes ADR-0043's transport value list, which itself superseded
ADR-0009's. Every other decision in both ADRs stands: the `PushPort` seam, the
per-provider classification functions, native APNS via `@parse/node-apn`, the
explicit `APNS_PRODUCTION` host selector, and `ntfy` remaining unimplemented.

## Consequences

**Positive**

- The production worker can boot, and therefore the promotion order can run,
  before Apple enrolment on 2026-10-12.
- Android push is proven on the transport Google Play actually ships against,
  rather than on a configuration that will be replaced at launch.
- The failure mode for an iOS token is visible in notification history instead
  of silent, and costs no device rows.

**Negative**

- A fourth enum value is a fourth production posture to reason about, and the
  wrong one in the wrong window is a real misconfiguration. Mitigated by boot
  validation: `fcm` with an incomplete `FCM_*` set still fails closed.
- `fcm` in production after iOS ships would silently stop delivering to iOS
  devices. Nothing in the schema can detect that, because the credential set is
  complete by `fcm`'s own rule. The October switch back to `fcm-apns` is
  therefore an explicit item on the iOS launch checklist, not an inference.

**Neutral**

- ADR-0009's original `fcm` selector value returns, but with the meaning fixed
  by ADR-0043: a transport covering the FCM-served platforms, not an
  operator-level choice of one provider for all devices.
- `apps/mobile/eas.json` already sets the unrelated client-side
  `EXPO_PUBLIC_PUSH_TRANSPORT=fcm`. The names coincide; the variables do not
  interact.

## References

- [ADR-0009](0009-notifications.md) — original push architecture
- [ADR-0043](0043-native-apns-delivery-via-node-apn.md) — native APNS, `test|fcm-apns|ntfy` enum
- [ADR-0039](0039-phased-cloud-first-hosting.md) — Railway-era hosting, fail-closed boot contract
- [S11 retro](../prd/sprints/sprint-11-railway-deployment-retro.md) — 2026-09-16 Apple deferral
