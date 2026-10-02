# Issue #538 / PR #554 — iOS native evidence

- App JS commit: `50ca48bbcfa22a23dbd75f49037978f4e8d19cb2` (PR head). Native dev-client build commit: unverified.
- Device: iPhone 17 simulator, iOS 26.2 (no Android emulator available).
- Environment `25f20f46-7965-4c5d-b7f5-6d85071b0a3d` (`auto.tm-rewrite-pr-554`); API deployment `7a50c061-8ea5-49ad-b6dc-afb380042d25`, worker `f6d54f07-3bcf-432c-9ee4-3e900be287e7`; `/readyz` commitSha `50ca48bb…`.
- Seller `+99361000003` (owns the only 2-photo Listing, Kia Sportage `f1000000-0000-4000-8000-000000000105`). Damaged was seeded Yes, so the flow was mirrored: No for the first save, Yes before Retry.
- The environment was reseeded after the checks finished, so live state no longer matches these files.

| File | What it shows |
|---|---|
| `1-checkA-error-steps.png` | Failed save: ✓ Save field changes, ✓ Attach photo, ✗ Remove photo, · Update photo order |
| `1b-checkA-top-banner-only.png` | Same failure, top of screen |
| `2-checkA-state-after-failure.png` | Still on step 8 with edited fields and photos |
| `2b-checkA-after-retry-detail.png` | After Retry: detail page, 1 / 2 photos |
| `checkA-server-before.json` / `checkA-server.json` | Server before and after (damaged true, P1 + new photo once, P2 absent) |
| `3-checkB-reopen-photos.png`, `3b-checkB-review-save-enabled.png` | Reopen after save: only server photos, Save enabled |
| `4-checkB-after-back-gesture-reopen.png` | Reopen after unsaved add + back gesture: no leftover photo |

Both checks pass. No OTPs or tokens are included.
