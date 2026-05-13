# 30 — Identity

## Summary

Phone-OTP based authentication, user profiles, dealership memberships, and the per-user Garage. The foundation of "who is this person and what can they do."

## Why it exists

Every gated action (favorite, chat, sell, save search) needs identity. Anonymous browsing is the default; auth is triggered on action with deferred-action replay. TM users are phone-rooted (most don't use email reliably), so phone OTP is the only viable login path. Admins need TOTP 2FA on top.

## What it does (user-visible behavior)

### Sign in flow

1. User taps a gated action (e.g., ♥ on a listing)
2. Bottom sheet: "Sign in to continue" + "Continue with phone" button
3. User enters phone number (+993 prefix locked; mobile prefix validated)
4. Backend issues 6-digit OTP, dispatches via SMS gateway
5. OTP code screen: 6 pin inputs, paste support, auto-submit on 6th digit
6. Resend after 60s timer
7. On success: JWT issued, user returned to the original action they tapped

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
| Profile (own) | New user | Prompt to add avatar + name |
| Profile (own) | Suspended | Banner: "Your account is suspended. Contact support." |
| Profile (other) | Default | Show public info only |
| Profile (other) | Blocked | "You blocked this user. Unblock?" |

## Data references

- `apps/api/src/modules/identity/CONTEXT.md`
- Entities: `User`, `Session`, `OtpRequest`, `Dealership`, `DealershipMember`, `OwnedVehicle`, `BlockedUser`, `TotpEnrollment`

## Decisions

- [ADR-0006](../../adr/0006-auth.md) — Phone OTP + custom SMS gateway + TOTP for admins

## Phase

**Phase 1.**

## Out of scope

- Email-based password recovery (no passwords in MVP)
- Social login (Google / Apple)
- Biometric (Face ID / Touch ID) — could add in Phase 1.5 as a session-unlock convenience
- Multiple active sessions per user — only one allowed (re-login revokes previous)
- Email verification

## Open questions

- Backup codes UX — printable PDF or screen-only? (Likely screen-only with copy-to-clipboard)
- TOTP issuer label: "AutoTM" or "auto.tm Admin"? (Likely "auto.tm")
- 30-day grace period for account deletion — confirm or shorter? (App Store doesn't mandate a specific window; 30 days is generous)
