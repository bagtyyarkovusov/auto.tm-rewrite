# apps/phone-agent — CONTEXT

> Current implemented state per [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md). Gradle structure + 4 Kotlin classes exist as scaffolding; the WebSocket connection + SMS dispatch behavior gets filled in when the sms-gateway WebSocket protocol ships. Aspirational behaviors below are clearly marked.

## Purpose

Kotlin Android app installed on each AutoTM OTP phone. Maintains a persistent WebSocket connection to `apps/sms-gateway` and dispatches SMS via Android's `SmsManager` when commanded.

## Hardware target

- Android 9+ (API level 28+)
- Phone must support `SEND_SMS` permission
- Phone is USB-tethered to Server B 24/7 (powers + USB networking when WiFi flaky)
- Battery optimization disabled for the agent app
- Foreground service notification (Android requires this for long-running background work)

## Source structure (today)

- `app/src/main/java/tm/auto/phoneagent/MainActivity.kt`
- `app/src/main/java/tm/auto/phoneagent/PhoneAgentService.kt` — foreground service shell
- `app/src/main/java/tm/auto/phoneagent/GatewayClient.kt` — gateway WS client
- `app/src/main/java/tm/auto/phoneagent/SmsSender.kt` — SMS dispatch wrapper
- `app/src/main/AndroidManifest.xml` — declares `SEND_SMS`, `READ_PHONE_STATE`, `FOREGROUND_SERVICE` (+ `FOREGROUND_SERVICE_DATA_SYNC`), `INTERNET`, `POST_NOTIFICATIONS`, `WAKE_LOCK`

## What it does (target behavior when integrated with sms-gateway WS)

1. On launch: register as foreground service, hold a wake lock
2. Read config from local storage: `gatewayUrl`, `authToken`, `phoneId`
3. Connect to gateway WebSocket
4. Heartbeat every 30s
5. On receiving `{ type: 'send', requestId, phone, message }`:
   - Use `SmsManager.sendTextMessage()` with the SIM specified
   - Send `message` unchanged; API / SMS gateway owns OTP body formatting for iOS and Android autofill
   - On dispatch success/failure: reply `{ type: 'sent', requestId, success, error? }`
6. On disconnect: exponential backoff reconnect

## Permissions

- `SEND_SMS` — sending OTP messages
- `READ_PHONE_STATE` — read SIM info for logging
- `INTERNET` — WS connection
- `FOREGROUND_SERVICE` — stay alive
- `WAKE_LOCK` — prevent doze

## Reliability features

- **Watchdog**: if agent crashes, system service restarts it
- **Persistent send queue**: if WS drops mid-send, queue holds the message until reconnect (with TTL — discard after 60s)
- **Battery-low handling**: phone reports battery state to gateway → gateway de-prioritizes routing
- **SIM hot-swap detection**: phone reboots / SIM removed → phone reports change to gateway, gateway suspends routing until human confirms

## Build / signing

- Gradle build (Kotlin DSL)
- Signed with AutoTM developer keystore (committed encrypted? out-of-band? see ADR TBD)
- Distributed by sideloading the APK to each phone — NOT via Play Store
- Versioned, with auto-update via the agent self-checking gateway for new APK URLs

## Dependencies

- `apps/sms-gateway` — connects to it via WS

## Notable decisions

- [ADR-0006](../../docs/adr/0006-auth.md) — Custom Android gateway approach
- [ADR-0019](../../docs/adr/0019-context-md-describes-current-state.md) — This CONTEXT.md describes current state
