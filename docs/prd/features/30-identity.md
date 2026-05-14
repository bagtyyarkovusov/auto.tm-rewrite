# 30 — Identity

## Summary

Phone-OTP based authentication, user profiles, dealership memberships, and the per-user Garage. The foundation of "who is this person and what can they do."

## Why it exists

Every gated action (favorite, chat, sell, save search) needs identity. Anonymous browsing is the default; auth is triggered on action with deferred-action replay. TM users are phone-rooted (most don't use email reliably), so phone OTP is the only viable login path. Admins need TOTP 2FA on top.

## What it does (user-visible behavior)

### Sign in flow

1. User taps a gated action (e.g., ♥ on a listing)
2. Bottom sheet uses action-specific copy, for example "Sign in to save listings", plus "Continue with phone"
3. Full-screen auth route `(auth)/phone`: user enters phone number (+993 prefix locked; mobile prefix validated)
4. Phone entry shows implicit legal agreement copy with Terms and Privacy links; no checkbox in S2
5. Backend issues 6-digit OTP, dispatches via SMS gateway
6. Full-screen auth route `(auth)/otp`: 6 visual pin cells backed by one actual input, paste/SMS autofill support, auto-submit on 6th digit
7. Resend after 60s timer
8. On success: JWT issued, user returned to the original action they tapped; if no deferred action exists, route to the tab app

### Admin TOTP enrollment

1. After OTP success, if user has `role='admin'` and no TOTP yet:
2. Show QR code (Google Authenticator-friendly URI)
3. User scans, enters 6-digit TOTP code
4. Backup codes shown (10 single-use codes); user must check "I saved them" before continuing
5. From now on, admin login requires OTP + TOTP

### Profile screens

- View own profile: avatar, name, phone (masked), tenure, garage count, listings count
- Edit profile: name, avatar upload, language preference, theme preference (system / light / dark), notification preferences
- View other user: avatar, name, tenure, **public** garage entries, listings, blog posts
- Block user from a chat → recorded in `BlockedUser` table

### Dealership

- A user can apply to create a Dealership (form: name, city, logo upload, description, working hours)
- Admin reviews and verifies → sets `verifiedAt` → PRO badge appears
- Dealership owner can invite other users as members (role: `sales`)
- A dealership has a public showroom page (see Feature 38)

### Account deletion (App Store hard requirement)

Apple App Store policy requires every app with account creation to offer in-app account deletion. This is non-negotiable.

- Profile → Settings → "Delete my account" (with a warning screen)
- Confirmation step: re-enter phone number to confirm
- Soft-delete: `User.deletedAt` set; all listings → `archived`; conversations → closed system message; refresh tokens revoked
- 30-day grace period: user can recover by logging back in (clears `deletedAt`)
- After 30 days: hard-delete personally identifiable data; preserve listings + messages as "Deleted user" attribution for audit trail
- API endpoint: `DELETE /api/v1/me`
- Admin can see deletion requests in the audit log; cannot reverse them after the 30-day window

## Screens / states

| Screen | State | Notes |
|---|---|---|
| Phone entry | Empty | Default — phone field focused, +993 prefix shown |
| Phone entry | Invalid format | Inline error: "Введите номер в формате +993 6X XXX XX XX" |
| Phone entry | Rate-limited | Error: "Too many attempts. Try again in 10 minutes." |
| OTP entry | Empty | Auto-focus on first pin |
| OTP entry | Wrong code | Shake animation + clear, "Wrong code, try again" |
| OTP entry | Expired | "Code expired. Request a new one." |
| OTP entry | Dev test mode | Non-production only: show "Dev code: 123456" if API returns `testCode` |
| OTP entry | Locked | Inline countdown / request-new-code state; no separate error route |
| Profile (own) | New user | Prompt to add avatar + name |
| Profile (own) | Suspended | Banner: "Your account is suspended. Contact support." |
| Profile (other) | Default | Show public info only |
| Profile (other) | Blocked | "You blocked this user. Unblock?" |

## Data references

- `apps/api/src/modules/identity/CONTEXT.md`
- Entities: `User`, `Session`, `OtpRequest`, `Dealership`, `DealershipMember`, `OwnedVehicle`, `BlockedUser`, `TotpEnrollment`

## Decisions

- [ADR-0006](../../adr/0006-auth.md) — Phone OTP + custom SMS gateway + TOTP for admins
- Mobile S2 auth routes are `(auth)/phone` and `(auth)/otp`. Historical `login` / `login/otp` route names are superseded for the mobile implementation.
- Legal agreement in S2 is implicit copy under the phone CTA: "By continuing, you agree to the Terms and Privacy Policy." Add a checkbox only if legal review requires explicit recorded acceptance. Legal pages remain canonical on web.
- OTP login does not ask for native notification permission. Notification prompts are tied to later user actions that need notifications.
- OTP SMS bodies must be formatted for iOS and Android autofill. The API/SMS gateway owns formatting; the phone-agent sends the body unchanged.

## Phase

**Phase 1.**

## Out of scope

- Email-based password recovery (no passwords in MVP)
- Social login (Google / Apple)
- Biometric (Face ID / Touch ID) — could add in Phase 1.5 as a session-unlock convenience
- Device management UI for revoking a specific other device — multi-device sessions are allowed per ADR-0012
- Email verification
- OTP "Having trouble?" support/help link — revisit after real delivery data; S2 keeps the flow minimal

## Open questions

- Backup codes UX — printable PDF or screen-only? (Likely screen-only with copy-to-clipboard)
- TOTP issuer label: "AutoTM" or "auto.tm Admin"? (Likely "auto.tm")
- 30-day grace period for account deletion — confirm or shorter? (App Store doesn't mandate a specific window; 30 days is generous)
