# Wireframe — Mobile Cabinet Tab

> Maps to: `apps/mobile/app/(tabs)/services.tsx` (Tab 5; the route keeps its `services` name)
> Governed by: [20 — Information architecture, Tab 5 — Cabinet menu](../../20-information-architecture.md#tab-5--cabinet-menu), the founder's [screen map amendment](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/344#issuecomment-5947347989) and the [#353 decisions](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/353#issuecomment-5946561929). This page describes what the app does on `main`. Notifications comes before My listings, as in the information architecture since #665.
> History: this page first described a "Services" hub with Profile, Settings, Bortzhurnal and Help & Support rows (#124). The 2026-10-02 amendment removed the Settings screen; that design is retired and not kept here.

==============================================
WIREFRAME — Mobile Cabinet Tab
Platform: mobile
==============================================

## Purpose

Cabinet is a plain menu. It reaches the User's account, Notifications, My listings, the language and theme pickers, Help, the legal pages and About. There is no Settings screen, no gear and no "List a car" row: the Sell tab is the only selling entry.

## ASCII wireframe

Signed out:
```text
┌────────────────────────────────────────────┐
│ Cabinet                                    │
├────────────────────────────────────────────┤
│ (◯)  Sign in                          >    │
│      By phone or email                     │
├────────────── gap ─────────────────────────┤
│ ◐ Language                    English      │
│ ────────────────────────────────────────── │
│ ◐ Theme                        System      │
│ ────────────────────────────────────────── │
│ ◐ Help                                     │
│ ────────────────────────────────────────── │
│ ◐ Terms of Service                         │
│ ────────────────────────────────────────── │
│ ◐ Privacy Policy                           │
│ ────────────────────────────────────────── │
│ ◐ Posting rules                            │
│ ────────────────────────────────────────── │
│ ◐ About the app                            │
└────────────────────────────────────────────┘
```

Signed in:
```text
┌────────────────────────────────────────────┐
│ Cabinet                                    │
├────────────────────────────────────────────┤
│ (A)  Display Name                     >    │
│      +993 6X XX-XX-42                      │
├────────────── gap ─────────────────────────┤
│ ◐ Notifications                       >    │
│ ────────────────────────────────────────── │
│ ◐ My listings                         5 >  │
├────────────── gap ─────────────────────────┤
│ ◐ Language                    English      │
│ ────────────────────────────────────────── │
│ ◐ Theme                        System      │
│ ────────────────────────────────────────── │
│ ◐ Help                                     │
│ ────────────────────────────────────────── │
│ ◐ Terms of Service                         │
│ ────────────────────────────────────────── │
│ ◐ Privacy Policy                           │
│ ────────────────────────────────────────── │
│ ◐ Posting rules                            │
│ ────────────────────────────────────────── │
│ ◐ About the app                            │
└────────────────────────────────────────────┘
```

## Numbered content blocks

1. **Screen title** — "Cabinet".
2. **Sign in row** (signed out) — large row with a neutral person avatar (never a car), "Sign in" and "By phone or email". Opens the sign-in flow and returns to Cabinet.
3. **Profile row** (signed in) — large row with the User's avatar, their Display Name on one line, and the masked Sign-in Method under it. The avatar is a 48 pt circle: the User's profile photo when they set one, otherwise their Assigned Avatar (`avatarIndex`) on a tinted circle, so it is never empty. The name is the name the User set, or their Generated Name — "Водитель 4821" / "Sürüji 4821" / "Driver 4821" in the reader's language; a name wider than the row ends in "…" instead of wrapping (`numberOfLines={1}`). Opens Profile. Sign-in Methods, Log out and Delete account live on Profile, not on Cabinet ([30 — Identity](../../features/30-identity.md#profile-screens)).
4. **Notifications** (signed in) — opens the release notification screen ([36 — Notifications](../../features/36-notifications.md#preferences-screen)).
5. **My listings** (signed in) — one row whose value is the total of the User's Listings and drafts (the "5" above). Before the first count arrives, after a failed request, and when it is zero, the row shows no number; a refresh keeps the last number until the next one arrives. It opens My listings (Active, Drafts, Archive) either way, and the count refreshes when Cabinet regains focus.
6. **Language** — shows the current language; opens a bottom-sheet picker (English, Русский, Türkmençe).
7. **Theme** — shows the current theme; opens a bottom-sheet picker (Light, Dark, System).
8. **Help** — opens Help: an email address and a phone number, signed in or out. No support chat.
9. **Terms of Service**, **Privacy Policy**, **Posting rules** — open the localized web legal pages ([83 — Legal](../../ops/83-legal.md#where-they-live)).
10. **About the app** — opens About: app name and version.

## Interactions

- Tap block 2 → sign-in flow; on success, back to Cabinet signed in.
- Tap block 3 → Profile.
- Tap block 4 → Notifications.
- Tap block 5 → My listings.
- Tap block 6 or 7 → bottom sheet over Cabinet; picking an option applies it and closes the sheet.
- Tap block 8 or 10 → Help or About.
- Tap a legal row → the web page for the current language, outside the app.
- Log out and a finished account deletion land here, signed out.

## States

- **Profile loading**: the profile row shows a skeleton; every other row stays visible and usable.
- **Profile failed**: the profile row shows an error and Retry; every other row stays visible and usable.
- **My listings count not yet arrived or failed**: the My listings row shows no number (a refresh keeps the last one); it still opens My listings.
- **Signed out**: blocks 2 and 6–10 only.
- **Offline**: rows stay visible; the screens they open handle offline.

## Content / copy

- Title: "Cabinet"
- Sign in row: "Sign in", "By phone or email"
- Rows: "Notifications", "My listings", "Language", "Theme", "Help", "Terms of Service", "Privacy Policy", "Posting rules", "About the app"

## Open questions for /hifi-design

- None. Layout and states follow the information architecture and the #353 decisions.
