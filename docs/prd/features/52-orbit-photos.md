# 52 — 360° Orbit photos (Phase 3)

## Summary

**Phase 3.** Walk-around 360° photography for listings — user takes 24-36 photos rotating around the car, and viewers swipe to "rotate" the car interactively. Industry standard for car ads (Carvana, Vroom).

## Why it exists

Static photos can't convey body condition. Orbit photos let buyers:
- See every angle without driving to the car
- Inspect for dents, rust, scratches
- Build confidence before contacting the seller

Especially impactful for high-value listings (>500k TMT) where a buyer wants to scrutinize before scheduling a visit.

## What it does (user-visible behavior)

### Capture flow

This is the most UX-sensitive part — bad capture UX = bad orbit photos = nobody uses the feature.

1. From listing wizard or post-publish edit: "Add 360° photos"
2. Camera screen opens with:
   - Live camera preview
   - Overlay: compass + car silhouette + "Step N of 24" indicator
   - Helper text rotating per step: "Stand at the front" → "Move 15° to your right" → etc.
   - Capture happens automatically when user reaches the right angle (using device gyroscope) OR manually with capture button
3. Photo taken at each step; preview thumb appears
4. After 24 frames captured: review screen with all thumbnails
5. Retake individual frames if blurry / off-angle
6. Submit → 24 photos uploaded to MinIO `orbit-photos` bucket

### Viewing

- Listing detail with orbit photos: a 360° widget below the regular photo gallery
- User drags left/right to "rotate" the car (cycles through the 24 frames)
- Indicator: "← Drag to rotate →" + current angle dot
- Pinch to zoom (Phase 3.5)

### Quality assurance

- Server-side: lightweight check that all 24 frames are roughly same exposure / framing
- If frames look broken (e.g., 5 of 24 are missing): flag for re-capture
- Admin can flag low-quality orbits + ask seller to redo

## Screens / states

| Screen | State | Notes |
|---|---|---|
| Capture | First launch | Tutorial overlay: "Walk around the car 360°. We'll guide you." |
| Capture | In progress | Live preview + compass overlay + step counter |
| Capture | Off-angle | Indicator: "Move 5° to your right" |
| Capture | Step done | Brief flash + auto-advance |
| Review | All 24 frames | Grid; tap any to retake |
| Review | Submit | Spinner + progress (uploading 24 photos) |
| Listing detail | Has orbit | 360° widget below regular gallery, "Drag to rotate" hint |
| Listing detail | Orbit processing | Placeholder "360° processing…" |
| Listing detail | Orbit broken | Hidden from view (fall back to regular photos only) |

## Data references

- `apps/api/src/modules/listings/CONTEXT.md` — `ListingMedia.kind = 'orbit'`
- MinIO bucket: `orbit-photos` — 24+ JPGs per orbit, keyed by frame index

## Technical notes

- Library candidates (mobile): `expo-camera` for live preview + gyroscope readings + capture
- Display library: `react-native-image-carousel-loop` or roll our own (it's ~30 lines)
- Compression: each frame at 1600×900 max, JPEG 75 — typical 200-300 KB per frame, total ~6-8 MB per orbit

## Decisions

- **Orbit photos (not equirectangular panoramas)** — much easier to capture with a phone, viewer is just swipe-through-frames, industry-standard for car ads
- **24 frames default** — 15° increments; experiments may tune to 36 (10°) if needed
- **Phase 3 — defer** because Phase 1 must ship without delay

## Phase

**Phase 3.**

## Out of scope

- True 360° spherical panorama capture (the "inside-the-bubble" view) — bad UX with phone alone
- Interior orbit (capture from inside the car) — defer; interior shots are normal photos in MVP
- AR overlay during capture (live "next angle" indicator) — nice but complex; basic UI is enough
- ML-based frame quality scoring — manual review + occasional admin flagging is enough

## Open questions

- Should orbit photos be a separate "media kind" requiring inspection (Phase 2 + 3 combo) or available to any seller? (Available to any seller — democratize)
- Storage cost — 24 frames × ~6-8 MB per listing × N listings. Plan for this in Phase 3 storage sizing
- Capture UX needs significant prototyping — likely 1-2 weeks of iteration during Phase 3
