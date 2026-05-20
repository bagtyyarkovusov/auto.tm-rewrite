# Wireframe — Mobile OTP Auth Screen

> Issue: #124 — apply wizard design handoff to app shell, auth, and listing wizard  
> Maps to: `apps/mobile/app/(auth)/otp.tsx`

==============================================
WIREFRAME — Mobile OTP Auth Screen
Platform: mobile
==============================================

## Purpose

Verify the six-digit SMS code, support paste/autofill, and return to the deferred action or tab app.

## ASCII wireframe

```text
┌────────────────────────────────────────────┐
│ [<] [X]                            RU TK EN│
│                                            │
│        auto.tm red SVG logo                │
│                                            │
│ Enter the code                             │
│ Code sent to +993 6X XX-XX-42              │
│ [Change number]                            │
│                                            │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐             │
│ │1 │ │2 │ │3 │ │4 │ │5 │ │6 │             │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘             │
│                                            │
│ ◐ Wrong code. Try again.                   │
│                                            │
│ Resend code in 42s                         │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Dev code: 123456                       │ │
│ └────────────────────────────────────────┘ │
│                                            │
└────────────────────────────────────────────┘
```

## Numbered content blocks

1. **Back action** — `Button variant="ghost"` circular icon (`ChevronLeft`). Returns to phone entry with previous number prefilled.
2. **Close action** — `Button variant="ghost"` circular icon (`X`). Cancels auth flow.
3. **Language switcher** — Same chips as phone screen.
4. **Brand mark** — Same SVG logo.
5. **Title + destination** — "Enter the code" (display font, 28px). Subtitle: "Code sent to +993 6X XX-XX-42" (masked phone, 16px).
6. **Change number** — `Button variant="link"` "Change number". Returns to phone screen; does not send new SMS.
7. **OTP cells** — Custom `OtpCells` composition:
   - 6 square cells (`aspect-square`, `rounded-lg`, `border-1.5 border-gray-200`).
   - Filled cell: border black.
   - Focused cell: border black 2px + shadow ring.
   - Error cell: border `destructive` 2px + rose shadow + shake animation.
   - Loading: cells are non-interactive, cursor disabled.
   - Hidden numeric `TextInput` behind cells handles paste, autofill, and auto-submit.
8. **Inline error area** — `AlertCircle` icon + specific error copy (see below).
9. **Resend action** — `Button variant="link"`. Disabled with countdown; enabled after timeout.
10. **Dev-only pill** — `Badge variant="outline"` "Dev code: 123456" visible only in non-production when API returns `testCode`.

## Customization preview

- **OTP cells** — custom composition of 6 `View`s over a hidden `TextInput`; owns shake animation via Reanimated or RN Animated.

## Interactions

- Tap Back → returns to phone screen with phone prefilled; code cleared.
- Tap Close → cancels auth and returns to original screen.
- Type 6th digit → auto-submits `POST /api/v1/auth/otp/verify`.
- Paste 6 digits → fills cells and auto-submits.
- Wrong code → shake cells, clear all, refocus first cell, keep phone/request context.
- Expired code → show "Code expired. Request a new one." and enable resend if backend allows.
- Locked → show "Too many attempts. Request a new code." with countdown.
- Tap Resend (when enabled) → requests fresh code for same phone; resets countdown.
- Success with deferred action → close auth and replay action.
- Success without deferred action → route to tab app; show "Signed in" toast.

## States

- **Loading**: OTP cells remain visible; hidden input disabled; prevent duplicate verify requests.
- **Empty**: First cell focused; destination copy visible.
- **Error (wrong)**: "Wrong code. Try again."
- **Error (expired)**: "Code expired. Request a new one."
- **Error (locked)**: "Too many attempts. Request a new code."
- **Error (used)**: "This code has already been used. Request a new one."
- **Error (rate-limited)**: "Too many attempts. Try again in a few minutes."
- **Error (generic)**: "Could not sign in. Try again."
- **Offline**: inline warning; keep entered code in memory while screen mounted.

## Content / copy

- Title: "Enter the code"
- Destination: "Code sent to +993 6X XX-XX-42"
- Change number: "Change number"
- Resend disabled: "Resend code in 42s"
- Resend enabled: "Resend code"
- Wrong code: "Wrong code. Try again."
- Expired: "Code expired. Request a new one."
- Locked: "Too many attempts. Request a new code."
- Used: "This code has already been used. Request a new one."
- Rate-limited: "Too many attempts. Try again in a few minutes."
- Generic: "Could not sign in. Try again."
- Verifying: "Verifying…"
- Dev-only: "Dev code: 123456"

## Open questions for /hifi-design

- Shake animation duration and easing token?
- Should the OTP cell font be mono (UberMoveMono) or sans?

## Design archive mapping

- `screens/02-otp.html` → `app/(auth)/otp.tsx`.
