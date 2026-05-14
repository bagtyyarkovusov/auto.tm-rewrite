# 60 — First-time user flow

## Summary

Maral (first-time buyer) installs the app. From cold open to first meaningful action, ≤ 60 seconds.

## Goal

- Build trust before asking for anything
- Get to "value moment" (seeing a listing she might want) in ≤ 10 seconds
- Defer login until she actually needs to do something gated

## Step-by-step

### Step 1 — Install & open (anonymous)

- App opens directly to the feed (no splash gate, no signup wall)
- Top: search bar
- Feed: latest listings
- Bottom: 5-tab nav

**No login prompt** — she's browsing.

### Step 2 — Browse

- She scrolls the feed; taps a listing she likes
- Listing detail opens: photos, price, specs, seller info
- She can scroll, view all photos, see related listings — all without login

### Step 3 — Wants to favorite ♥

- She taps the ♥ button
- Bottom sheet slides up: "Sign in to save listings"
- Single button: "Continue with phone"
- (X close also returns her to the listing, no harm)

### Step 4 — Phone entry

- Phone screen with +993 locked prefix
- Numeric keypad, large pin-style input
- Helper text: "We'll send a code via SMS"
- Legal copy under the CTA: "By continuing, you agree to the Terms and Privacy Policy." Links open canonical web legal pages.
- She enters her number, taps "Get code"
- No confirm screen before SMS; invalid phone formats are handled inline

### Step 5 — OTP entry

- 6 pin inputs, focused on first
- "Code sent to +993 6X XXX XX 42" with resend timer
- iOS auto-pastes from SMS via `textContentType="oneTimeCode"`
- Android: keyboard auto-suggests
- Auto-submit on 6th digit
- "Change number" returns to phone entry with the previous number prefilled
- Wrong code shakes, clears all digits, and refocuses the first cell

### Step 6 — Profile setup (deferred)

- After OTP success, return to where she was (the listing)
- ♥ is now filled (the deferred action played)
- Toast: "Saved to Favorites"
- OTP itself does not show a separate "Signed in" toast when a deferred action owns the feedback
- No "complete your profile" interruption — she can edit profile later

### Step 7 — Profile gentle nudge

- Next time she opens the Services tab → Profile shows "Add a photo and name" banner
- She can dismiss or proceed
- Optional, never blocking

## Key design rules this flow enforces

- **No login wall on browse** — anonymous-first
- **Action-gated auth** — login modal only triggers when user attempts a gated action
- **Deferred action replay** — after login, the originally-intended action completes automatically
- **No "verify email"** — phone OTP is the only step
- **No profile gate** — name + avatar are optional, can be added anytime

## Edge cases handled

- User cancels the OTP modal → returns to the listing, no state lost
- OTP expires (5 min) → re-request flow
- Wrong code → shake + retry without losing OTP request
- Network drops mid-OTP → graceful "Try again"
- User exhausts OTP attempts (5) → 10-min cooldown with clear message

## References

- [Feature 30 — Identity](../features/30-identity.md)
- [Feature 32 — Listings](../features/32-listings.md)
- [Feature 36 — Notifications](../features/36-notifications.md) — first notification permission prompt timing

## Open questions

- Should we pre-load the feed cache so step 1 is instant on poor mobile data? Yes — bundled cold-start data for the first page

## Resolved follow-up decisions

- Native notification permission is asked at most once automatically, after a concrete notification-using action such as sending the first chat message or enabling saved-search notifications. It is not part of OTP login.
- If notification permission was declined, later notification features show an inline System Settings CTA instead of opening the native prompt again.
