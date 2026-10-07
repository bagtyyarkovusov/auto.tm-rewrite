# Issue 714 native photo-state evidence

Captured on 2026-10-07 from source commit `bd51bc14` using the existing SDK 55 Android debug client, `Medium_Phone_API_36.1` on `emulator-5554`, and an owned Metro server on port 8100.

| State | Screenshot | Native Continue state |
|---|---|---|
| 2 photos, English, light | [photos-2-en-light.png](photos-2-en-light.png) | disabled |
| 3 photos, English, light | [photos-3-en-light.png](photos-3-en-light.png) | enabled |
| 2 photos, English, dark | [photos-2-en-dark.png](photos-2-en-dark.png) | disabled |
| 3 photos, English, dark | [photos-3-en-dark.png](photos-3-en-dark.png) | enabled |

These are **fixture-state screenshots**, using the actual `WizardLayout`, `Step2Photos`, and shared `StepPhotosSchema`. A temporary uncommitted route supplied two or three uploaded fixture photos. Its exact source is [photo-proof-route.tsx.txt](photo-proof-route.tsx.txt), also preserved at `/tmp/714-photo-proof-route.tsx`. No sign-in details were entered, no API publication was performed, and the route was removed after capture. It is not a shipped debug feature.

Android UI Automator reported the Continue accessibility node disabled at two and enabled at three. It also supplied the displayed counter and helper text. [proof.json](proof.json) records those observed states, source and screenshot SHA-256 hashes, dimensions, and metadata checks. All four screenshots are unedited 1080x2400 PNGs without EXIF or XMP. The source hashes were checked again after removing the route; tracked shipped source remained identical. Generated router typing was restored to its preceding state. The native debug-server preference was restored, the 8100 reverse removed, and both owned Metro and emulator processes stopped.

The three Camry photographs are by Damian B Oh, CC BY-SA 4.0. Attribution and original source records are in [the reviewer fixture README](../../../../packages/db/scripts/reviewer-fixtures/README.md) and its manifest, and on the localized public demo-credits pages. These screenshots retain the photographs' attribution and licence requirements.

These captures use the current source styles. They do not claim the later accepted PR #696 styling was integrated. API publication, ownership and concurrent-removal proof belong to the hosted tests; this native session proves component appearance and the shared-schema minimum state only.
