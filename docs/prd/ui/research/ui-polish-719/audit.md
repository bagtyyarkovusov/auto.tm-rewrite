# Issue 719 bounded screen audit

Base: accepted UI baseline `9c5d9ce057ba1873db8f0f9f32f29f34850784ee`.
This is source inspection and a native proof plan, not a release-wide visual sign-off.

## Files and states reserved before implementation

Production edits are limited to `apps/mobile/src/listings/feed/HomeHeader.tsx`.
Documentation edits cover `docs/prd/ui/hifi/mobile-tabs-index.md`,
`docs/prd/ui/components/78-03-card.md`, and this audit.
Home's existing navigation, query, feed, Favorite replay and behavior assertions
remain intact. No token, shared primitive, native dependency or account flow change.

| Area | Bounded source inspected | States to inspect natively |
|---|---|---|
| Home | HomeHeader; Search stack index; FeedEmpty; FeedError; Results BrandModelCard size reference | Populated, zero count/empty catalog, initial loading, feed offline/error with count unavailable; light/dark; EN/RU/TK |
| Detail/gallery | ListingDetail; PhotoGallery; PhotoViewer | 0/1/2 photos, active/closed/owner listing, viewer with contact actions, swipe/zoom/close |
| Favorites/Messages | tabs favorites/chat; ConversationEntryStates; ConversationHeader; MessageComposer | Signed out, empty, error, loaded; long peer name; attachment/remove; keyboard open |
| Sell/ownership | DraftCard; OwnerListingCard; wizard entry/routes | Empty drafts, draft progress, long listing title, blocked listing actions; wizard keyboard/error |
| Account/code | MenuRow; SignInMethodEntryScreen; CodeEntryForm; OtpCells | Signed out/signed in; long display name; add/change method with keyboard; wrong code and resend/daily limit |

Every affected Home state must retain the AutoTM wordmark, Search action,
Brand/model action and New listings/See all hierarchy. Count loading shows a
skeleton; unavailable count shows no invented number; zero shows localized zero.
Use the screen's existing feed state components and recovery actions.

## Concrete source findings

- **Home visual mismatch, in scope:** title is `text-headline` (22) bold with a
  filled 56-point car disc and a filled 36-point arrow. Quiet card requires a
  16-point semibold title, footnote count, plain muted car/chevron, compact
  padding, rounded-2xl raised surface and a light hairline edge.
- **Home documentation defect, in scope:** mutable hi-fi points to the removed
  tabs index and describes an unshipped personalized stub, obsolete font and
  neutral classes. Replace with current Search stack Home and ADR-0051 states.
- **Message attachment remove target, separate fix needed:** MessageComposer's
  24-point remove control has 8-point hitSlop (nominal 40 total), inside two
  clipped preview containers, and no button role. This does not establish a
  44-point reachable TalkBack/touch target. Source: MessageComposer lines
  192–205; governing icon-button target: components/78-01-button.md line 61. Reproduce with attached image,
  keyboard open and TalkBack; fix the hit region and role in a Messages issue.
- **Code Reduce Motion, separate fix needed:** OtpCells always starts a 200ms
  four-step horizontal shake through Animated; there is no accessibility
  setting branch in this component (OtpCells lines 35–59). Governing
  mobile-otp-login-flow.md line 469 requires an instant error and focus reset
  instead of shake under Reduce Motion; mobile-auth-otp.md line 313 agrees.
  Preserve wrong-code/reset behavior while
  making the error indication respect Reduce Motion in an account/code issue.
- **Account keyboard/layout risk, not a confirmed runtime defect:**
  SignInMethodEntryScreen uses a fixed flex View with no ScrollView and iOS-only
  KeyboardAvoidingView behavior. Verify small Android screen, RU/TK helper and
  1.5/2.0 font scale with keyboard before declaring a defect.

No additional visual defect is established by source alone in detail/gallery,
Favorites empty states, draft/owner cards or ConversationHeader. These use
semantic text/surface tokens and keep their existing actions. Native checks
remain required; this statement is not a claim that those areas are complete.

## Native audit limits and pending evidence

Source inspection cannot prove NativeWind layout/colors, TalkBack ordering,
keyboard clearance, native performance or animated setting behavior. Capture
Home's four states in light/dark with EN/RU/TK coverage, a narrow viewport and
large font, then verify each header target remains reachable. Home has no text
input: keyboard checks belong to the named account/composer flows.

Home's solid card introduces no transparency or blur; the existing press
primitive is retained. Reduce Motion/Transparency, Android gesture/three-button
insets and performance still need native proof. The root assigns one native/heavy
slot; no emulator, Metro, export or full gates started during this source phase.

No visual-only test assertions are edited. Existing source route checks are
retained; their presence is not counted as rendered behavior proof. Run existing
rendered Home/feed behavior checks and add only coverage needed by actual
behavior changes. Visual-only styling has the ADR-0070 red-test exemption.

## Before visual evidence

`before-home-dark-ru.png` is the preserved native dark RU populated Home from
the root baseline session (Medium_Phone_API_36.1 / emulator5554, JS `080566ca`,
API `b80f021b`). Root's `/tmp/ui696-baseline-final-evidence.md` records the run.
HomeHeader's blob `eded0ff838cc798dfcbfc4e8c4f206f51c148177` is identical in
that JS head and accepted main `9c5d9ce0`. Inspected before editing: the filled
car/arrow discs and oversized label dominate the raised card. This proves one
before state with source provenance; light/loading/error/empty before captures
are absent and it is not an exact-final-SHA full-state claim. New affected-state
proof remains pending the assigned native slot.
