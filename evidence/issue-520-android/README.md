# Android evidence, PR #555 (issue #520), app JS b6e9f00

- App JS commit: b6e9f00ce6fd65563ecd2f63080f3b0c183a80d8 (PR head), served by Metro from a detached worktree at that commit
- Native build commit: unverified (existing debug dev build; the PR diff is JavaScript only)
- Device: Android emulator Medium_Phone_API_36.1, Android 16 (API 36); UI language English; status bar fixed to 9:41
- Railway environment: auto.tm-rewrite-pr-555 (8be8da9e-a0c6-4956-aca5-9a1f00e14be5)
- Deployments: API b45276ee-5ae2-41c8-a922-e8f6d77ef998, worker e1c26f28-f7b4-45cd-9c59-009af89e073d (both SUCCESS)
- /readyz: ready, postgres/redis/minio ok, commitSha b6e9f00ce6fd65563ecd2f63080f3b0c183a80d8
- Seed: not re-run in this pass (fixture listings and users were already present; a reseed would end other sessions)

Screenshots are in `b6e9f00/`. Files from the earlier partial pass sit next to it and are superseded by this folder.

Notes
- 02-signed-in-dark was taken as the fixture seller; a faint pressed state is visible on the Language row.
- 03-me-loading: caught by blocking the network for the app; it stayed on the skeleton.
- 04 (/me error with Retry) was not captured: offline, the query stays paused and shows the skeleton; with a dead system proxy the skeleton was still shown after about 5 minutes. Unit tests cover the Retry state.
