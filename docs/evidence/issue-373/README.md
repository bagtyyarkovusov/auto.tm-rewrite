# Issue 373 evidence

Implementation is on `agent/issue-373` in the sole writing worktree `/Users/bagtyyar/.codex/queue-worktrees/autotm-373-20260930-sol`, draft PR466. The rendered foundation merged at e69f0499564616c33547fafd3a61f8eefc5d5c70; this branch is not stacked on a prototype or evidence branch.

## Acceptance evidence

| Criterion | Behavioral and native evidence |
|---|---|
| Approved order and sparse fields | `listingRelease373.spec.tsx` renders ordered title/price/date-city/six-spec grid/remaining rows/description/condition/seller/report/footer; sparse fixture omits absent fields. [Buyer](buyer-active.png), [collapsed/clamped](buyer-collapsed.png), [expanded seller/footer](buyer-seller-footer.png) |
| Numeric photos and measured header | Release tests render1/1, use measured gallery layout/scroll, preserve Back/Share/Favorite/More, tap platform Share and canonical Copy link. [Collapsed](buyer-collapsed.png) |
| Seller identity and verification | Release and SellerBlock specs render real name/fallback, join month and city/place, assert no badge. ADR-0056/current PRD SMS caption beside Call. [Seller/footer](buyer-seller-footer.png), [buyer Call/SMS](buyer-active.png) |
| Public footer | Release test publicNumber/Published/Updated; [footer](buyer-seller-footer.png) |
| Owner privacy and controls | Release tests owner-only counts/original currency; five rendered OwnerActions tests exercise Edit, active/sold/archived menu, mutation confirmation/cancel/error. [Active](owner-active.png), [overflow](owner-overflow.png), [sold](owner-sold.png), [archived USD](owner-archived-usd.png), [republish](owner-archived-overflow.png) |
| Closed buyer states | Release tests sold/archived no contact/Favorite/Report, muted price, banner and similar navigation. [Sold](buyer-sold.png), [archived](buyer-archived.png) |
| 404 recovery | Release test taps Home and Back; [404](not-found.png). Development LogBox shows the expected404 request log; it is not a product banner. |
| Removed entry points and decoded VIN | Rendered release/trust/VIN specs prove no inspection/trust or undecoded/empty VIN section; decoded fixture retained. `sell.tsx` has no post-publish prompt parameter. ADR-0057 unused component/hook/tests retained; backend unchanged. |
| Direct Call and auth actions | Release and seven rendered CTA checks cover anonymous direct tel, intent parking, unavailable/pending chat, signed-in tap and replay. Native anonymous [Message](anonymous-message-auth.png), [Report](anonymous-report-auth.png), [Favorite](anonymous-favorite-auth.png) entry captures; local seller sign-in completed the Favorite replay. |
| Loading and theme | [Pending-request skeleton](loading.png) captured while only own API process was paused, then resumed. Final dark captures follow the Message icon contrast correction. |
| Overview | `apps/mobile/src/listings/CONTEXT.md` updated to the implemented boundary. Documentation and visual criteria use ADR-0070 exemptions. |

## Red and green

[Meaningful red](red-before-implementation.md) was pushed before production edits. Initial21 rendered tests had16 behavioral failures/5passes; counter/copy additions22tests17fail/5pass. No setup error counted as red.

Release22 + owner5 and migrated CTA7 rendered tests pass. The first full run exposed five obsolete CTA source-search assertions; they now test rendered behavior, while Share/Favorite evidence lives with the header. CI run36735378199 failed on those same obsolete assertions. A service-backed full rerun passed mobile143files/1097tests and API164files/1381tests; all10 workspace tasks passed, plus agent-docs/glossary/reviewer-flow checks. Repository typecheck11tasks passed. Mobile lint, Expo alignment, iOS export and native development build passed. A final gate rerun after the visual icon correction is in progress; exact final result will be recorded before review handoff.

## Native setup and boundaries

Own API3473 / Metro8473; exclusive iPhone17 UUID38747B85-BB39-48A2-BF0D-4DD6A5ED1D13, bundle tm.auto.app. Docker project auto_tm_ci_3730930_1 has ephemeral Postgres50975, Redis50976, MinIO50974. `auto_tm_ci` is the test DB; `auto_tm_373_runtime` is separately migrated/seeded for screenshots. `ui:fixture` downloaded real photos and seeded12 listings. Only this isolated runtime DB was changed for contactPhone/place, sold/archived statuses, non-owner/owner permutations and USD original-price proof. Fixture phone +99361000001 signs into this run's API in approved CI OTP test mode. No child458 or production credentials were reused.

Native launch initially inherited8458 debug preferences; corrected app-container RCT_jsLocation to127.0.0.1:8473 with a simulator restart. Expo's default8081 launch was not counted as proof. No native source or node_modules patch was made.

Approved content/release-screen prototypes remain read-only, unmerged and undeleted. Ask seller, photo viewer changes and card-cache loading are separate slices. Accepted authority reconciliations: issue comments5913238601 (ADR-0056 no badge/SMS caption) and5913481344 (ADR-0057 unused inspection code retained).

Context7: ExpoSDK55/Clipboard, RN, RNTL13.3.3, NativeWind4.2, RNR, Reanimated and Prettier3.8.3 consulted. Static NativeWind classes and existing native primitives retained; no framework/configuration migration.
