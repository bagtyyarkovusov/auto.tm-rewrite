# Issue 718 native evidence

This package records verification of source `d3ea31ec7eb6650df20fe75ae6b55ce68a845871` for [PR 727](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/727). The later evidence commit changes only this folder. Production and tests remain byte-identical to that source. No new native, performance or suite run was made while packaging.

## Captures and provenance

| Capture | Observed state and bound |
|---|---|
| [Guest feed](actual-guest-dark.png) | Actual PR727 API, dark, gesture navigation, zero Listings. |
| [Cabinet](actual-cabinet-light.png) | Clean production source, light, signed out, three-button navigation. |
| [Light scroll A](fixture-light-scroll-a.jpg), [B](fixture-light-scroll-b.jpg) | Local photo fixture, actual native BlurView, changing photo/header content behind the bar. |
| [Dark gesture](fixture-dark-gesture.jpg), [dark three-button](fixture-dark-threebutton.jpg) | Local photo fixture, actual blur, readable Russian labels and inset clearance. |
| [Reduced-motion lens](fixture-reduced-motion-lens.jpg) | Actual system reduced-motion setting read as true after restart; direct-control slide remains. |
| [Transparency simulation](simulated-transparency-dark.jpg) | Native opaque fallback pixels with explicit temporary true override. Android has no matching OS setting in this implementation. |
| [Older Android simulation](simulated-old-android-light.jpg) | Native translucent fallback with explicit `ANDROID_BLUR=false` override on API36.1. Not an actual older-device run. |
| [Paired baseline](paired-baseline-dark.jpg), [feature](paired-feature-dark.jpg) | Same dark fixture, gesture navigation, first-photo position and resolution before each measured leg. |

All images were visually checked; names were assigned from pixels, not the earlier temporary filenames. Photo-heavy PNG captures were encoded to JPEG at quality92 without cropping, resizing or retouching. Small actual-state PNGs retain their original bytes. [Original capture hashes](original-capture-sha256.txt) preserve the native PNG inputs; [package hashes](package-sha256.txt) cover the distributed files.

Temporary proof used real AutoTmTabBar, TabBlurTargets, GlassSurface/Expo BlurView and PhotoGallery, with eight galleries of three approved local Camry photos. It did not create or publish a server Listing. Exact [native fixture](native-fixture-source.txt), [paired fixture](paired-fixture-source.txt), [trace source hunks](native-trace-source.txt), [transparency override](transparency-override-source.txt), [older-Android override](old-android-override-source.txt) and [paired baseline override](paired-baseline-source.txt) are inert `.txt` files. Unrelated generated-router hunks are omitted; blank diff context-space markers are stripped for the document whitespace check, with code lines unchanged. The [workload](paired-workload-source.txt) retains every recorded command and delay; only its machine-local ADB executable path is replaced by PATH `adb` for portability.

[Sanitized native observations](native-events.txt) record first-mounted Search handle612 binding to BlurView612, accepted Favorites handle1496, target cleanup and5 native haptic invocations/resolutions:1 accepted tap plus4 distinct slide crossings. Repeated tap and release add0. These are actual refs/bridge calls, not mocked native hosts. They do not prove physical haptic feel. Nineteen rendered tests additionally cover repeated/prevented taps, registration/removal, API29/30 and iOS branches.

The Camry photographs are by **Damian B Oh**, licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), approved by the founder for issue714 on2026-10-07. [Approved provenance/attribution manifest](photo-attribution.json) preserves all three source pages, acquisition URLs and original asset SHA256s from issue714 source `8f1baaa6`. Photos were read locally from its approved bundle, with no new download. The photographs in these screenshots are displayed, scaled and JPEG-encoded derivatives; retain this attribution and CC BY-SA4.0 terms when redistributing the photo material. No EXIF/GPS metadata, seller/user identifiers or credentials are included.

## Warm paired performance

Exactly one pair ran on healthy cold host graphics, emulator36.3.10/API36.1, Medium_Phone_API_36.1/5554, same app process2940, Metro8101,1080×2400, dark/Russian, gesture mode2, normal transition scale1.0. Baseline retained target registration and normal tuned material while skipping the tab blur pass. Feature restored GlassSurface source byte-for-byte.

Each leg first warmed the identical workload, returned the fixture to scroll y0, waited5s, then reset gfxinfo. The measured workload was four700ms scroll-up/down pairs plus two1400ms cross-tab slides and back, identical250ms gaps, then1s settlement. Startup, first image loads, refresh and warm-up frames were excluded. No setting/source mutation occurred during either measured leg.

| Mode | Frames | Janky frames | Jank | p50 | p90 | p95 | p99 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Blur disabled |667|14|2.10%|17ms|20ms|22ms|32ms|
| Actual blur |663|13|1.96%|18ms|20ms|22ms|25ms|

[Baseline summary](paired-baseline-summary.txt) and [feature summary](paired-feature-summary.txt) retain the native counts and reset timestamps. Legacy jank was94/667,14.09%, versus57/663,8.60%. Median rose1ms, p90/p95 were unchanged, and jank fell0.14percentagepoints. No material regression appeared in this one pair. No pass threshold, statistical significance, release-device performance or physical60fps is claimed. The earlier mixed17.6%debug sample was exploratory and is not this controlled comparison.

Context7 `/websites/developer_android` verified official gfxinfo/framestats; Expo SDK55 documentation verified BlurTargetView refs, API31Plus blur and Clock_Tick haptics. Installed Reanimated4.2.1 source checks Android TRANSITION_ANIMATION_SCALE; its startup-only reduced-motion behavior was verified through Context7. No unavailable-server fallback was needed.

## Source, backend and remaining limits

Native build inputs were Expo55.0.31, React Native0.83.10, Blur55.0.18, Haptics55.0.18, JDK17 and Android SDK36.1. Fresh Android prebuild/development rebuild passed in79s; Blur/Haptics autolinked and the merged manifest contains VIBRATE. [Source input hashes](source-input-sha256.txt) and [generated native input hashes](native-input-sha256.txt) identify the build inputs. Preserved APK `/tmp/ui718-verify-d3ea31ec.apk` has SHA256 `a666d3c2b7d389f58196e10ca8214d35b9aaa7299a8b77db232b5f08f4c7e526`; the large binary is intentionally outside Git. Its source is d3ea31ec; temporary fixture JS was served later by Metro and was never embedded as production behavior.

[Backend readiness](backend-readiness.json) reports actual commit d3ea31ec in `auto.tm-rewrite-pr-727`. [Public observations](backend-observation.json) record readiness200, anonymous feed200 with0 Listings and MinIO health200. Health is not proof of a readable photo object. The coordinator recovered the isolated PR API; this verifier made no seed, deploy, configuration, credentials or server-data changes. Local photos do not establish a populated real API/media/publication flow.

Repository unit/typecheck, full mobile lint, Expo alignment and both exports passed on the verified source; final19 focused rendered tests passed after temporary proof removal. Full unit results used9 content-hash cache hits plus fresh mobile271 files/2762 tests; typecheck used10 cache hits plus fresh mobile. Packaging runs only evidence/document checks. Hosted required `pr` and the sole fresh Standards+Spec review belong to the root coordinator at the final evidence head.

Actual API29/30 runtime, iOS client rebuild/system glass/Reduce Transparency setting and physical haptic feel remain unavailable. Installed image inventory contains only Android36.1 and the assigned AVD; no older image/AVD or iOS device was added or started. Native/Metro processes were stopped, temporary route/assets/logging/generated-router changes removed, preferences/reverse restored, and the native slot released before packaging.
