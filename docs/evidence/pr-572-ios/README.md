# PR 572 integration build, iOS evidence (partial)

Captured 2026-10-02 20:13 UTC on iPhone 17 simulator `38747B85-BB39-48A2-BF0D-4DD6A5ED1D13`, development client, Metro on port 8092 from the integration branch at `ad25c4c4d0cdde1f73017aada97e8153b022ca9b`.

Backend: Railway environment `f02a48cf-4bbd-40b5-a61f-64aeb7870440`, API deployment `7ff576c7-666b-4983-b796-bf47892cdb99`. `/readyz` returned `ready` with postgres, redis and minio `ok` and the same commit SHA.

The backend was not seeded when these were taken, so only states that need no fixtures are here.

| State | Light | Dark |
|---|---|---|
| Messages, signed out | `messages-signed-out-light.png` | `messages-signed-out-dark.png` |
| Cabinet, signed out | `cabinet-signed-out-light.png` | `cabinet-signed-out-dark.png` |
| Feed, empty (unseeded backend) | `feed-empty-light.png` | not captured |
