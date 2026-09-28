# Android phone agent

The Android project is a scaffold for the physical SMS gateway phones. It has a foreground-service shell, an HTTP client configuration, and an SmsManager wrapper. They do not form a running gateway-to-phone delivery protocol yet.

Do not assume WebSocket reconnect, heartbeat, persistent queues, battery routing, wake-lock acquisition, SIM monitoring, or auto-update exists. Inspect the service and client before claiming delivery readiness. Manifest permissions express requested capabilities, not proof that behavior is wired.

Preserve the Gradle wrapper and native project. Signing credentials belong outside Git. Future integration must verify Android permissions and real-device send/acknowledgement behavior; a JS workspace test cannot establish this.

## Start here

- [Foreground service](app/src/main/java/tm/auto/phoneagent/PhoneAgentService.kt)
- [Gateway client scaffold](app/src/main/java/tm/auto/phoneagent/GatewayClient.kt)
- [SMS wrapper](app/src/main/java/tm/auto/phoneagent/SmsSender.kt)
- [Manifest](app/src/main/AndroidManifest.xml)
- [Gateway boundary](../sms-gateway/CONTEXT.md)
