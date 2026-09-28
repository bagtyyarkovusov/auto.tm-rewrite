# SMS gateway

This service is a scaffold for physical-phone SMS delivery. Its authenticated send route currently uses a mock that returns success with a generated ID without sending or logging an SMS. Selecting `OTP_DRIVER=fleet` still instantiates that mock. Do not treat a successful gateway response as proof of phone delivery.

The service has HTTP health/send routes and environment validation. No fleet WebSocket server, per-phone routing, or persistent send queue is implemented. The Android phone app is also a scaffold. Keep this boundary for the future TM deployment; deployment plans are not implemented reliability features.

## Start here

- [Driver selection](src/server.ts)
- [Mock behavior](src/adapters/OtpSenderMock.ts)
- [Authenticated send route](src/routes/send.ts)
- [Environment configuration](src/env.schema.ts)
- [Phone scaffold](../phone-agent/CONTEXT.md)
- [Original auth decision](../../docs/adr/0006-auth.md)
- [Phased hosting decision](../../docs/adr/0039-phased-cloud-first-hosting.md)
