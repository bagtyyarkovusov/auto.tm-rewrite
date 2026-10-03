# Hi-Fi — Mobile Cabinet Tab

> Maps to: `apps/mobile/app/(tabs)/services.tsx` (Tab 5; the route keeps its `services` name)
> Derived from wireframe: `docs/prd/ui/wireframes/mobile-tabs-services.md`
> Governed by: [20 — Information architecture, Tab 5 — Cabinet menu](../../20-information-architecture.md#tab-5--cabinet-menu), the founder's [screen map amendment](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/344#issuecomment-5947347989) and the [#353 decisions](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/353#issuecomment-5946561929). Where this page and the information architecture differ, the information architecture wins.
> History: this page first specified a "Services" list with Profile, Settings, Bortzhurnal and Help & Support rows (#124, design archive `app-shell.html`). The 2026-10-02 amendment removed the Settings screen; that design is retired and not kept here.

==============================================
HIGH-FIDELITY DESIGN — Mobile Cabinet Tab
Platform: mobile
Mode: light + dark
==============================================

## Purpose

Cabinet is a plain menu in Auto.ru's manner. Rows never wait for the network, except the profile row, which waits for `/me`, and the My listings total once it ships (see [Current app differs](#current-app-differs)). There is no Settings screen, no gear and no "List a car" row.

## Layout

```text
┌────────────────────────────────────────────┐
│ safe-top                                   │
│ Cabinet                                    │
├────────────────────────────────────────────┤
│ (A)  Display name                     >    │  large row, 76px
│      +993 6X XX-XX-42                      │
│░░░░░░░░░░░░░░░░ gap 8px ░░░░░░░░░░░░░░░░░░░│
│ ▣  My listings                    5   >    │  signed in only
│ ── divider ──────────────────────────────  │
│ ▣  Notifications                      >    │  signed in only
│░░░░░░░░░░░░░░░░ gap 8px ░░░░░░░░░░░░░░░░░░░│
│ ▣  Language                    English     │
│ ── divider ──────────────────────────────  │
│ ▣  Theme                        System     │
│ ── divider ──────────────────────────────  │
│ ▣  Help                                    │
│ ── divider ──────────────────────────────  │
│ ▣  Terms of Service                        │
│ ── divider ──────────────────────────────  │
│ ▣  Privacy Policy                          │
│ ── divider ──────────────────────────────  │
│ ▣  Posting rules                           │
│ ── divider ──────────────────────────────  │
│ ▣  About the app                           │
└────────────────────────────────────────────┘
```

Every row within a group is separated by a divider; groups are separated by a gap.

Signed out, the large row reads "Sign in" / "By phone or email" with an empty avatar, and the My listings and Notifications group is absent.

## Current app differs

This page specifies the target set by the information architecture. As of `main` at `8cc467a`, `apps/mobile/app/(tabs)/services.tsx` differs in two ways:

- **Row order:** the app lists Notifications before My listings. The information architecture puts My listings first. The app has not yet been changed to match.
- **My listings total:** the app shows the row without a number. The total comes from [#524](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/524) (open PR #576); until it merges, the row has no value.

## Token map

### Backgrounds + surfaces
- Root: `bg-background`
- Row press feedback: `active:bg-secondary`
- Group gap: `h-2 bg-secondary`

### Borders + dividers
- Row divider: `h-px bg-border`, inset `ml-[54px]` to the label after the icon

### Typography
- Screen title: `text-2xl font-heading text-foreground`
- Row label: `text-base text-foreground`
- Large-row label: `text-lg font-semibold text-foreground`
- Large-row second line: `text-[13px] text-muted-foreground`, one line
- Row value (Language, Theme, My listings total): `text-[15px] text-muted-foreground`

### Spacing
- Title: `px-4 pt-6 pb-3`
- Row: `flex-row items-center gap-3.5 px-4 py-2`; `min-h-14`, large row `min-h-[76px]`
- Scroll bottom padding: `pb-6`

### Icons
- Row icon: Lucide, `size-6 text-muted-foreground` — `List` (My listings), `Bell` (Notifications), `Globe` (Language), `Contrast` (Theme), `CircleHelp` (Help), `ShieldCheck` (Terms of Service), `FileText` (Privacy Policy), `ScrollText` (Posting rules), `Info` (About the app)
- Large row: `Avatar` `size-12`; fallback is the name's initial or a `User` icon
- Chevron: `ChevronRight`, `size-[18px] text-muted-foreground opacity-60`, on the large row, My listings and Notifications only. Language, Theme, Help, the legal rows and About have none

## Component shape

The screen composes the shared account rows; it adds no new primitive.

| Component | File | Use |
|---|---|---|
| `MenuRow`, `MenuDivider`, `MenuGap` | `apps/mobile/components/account/MenuRow.tsx` | Every row, divider and group gap; shared with Profile |
| `LanguageRow`, `ThemeRow` | `apps/mobile/components/account/` | Rows with the current value; each opens `OptionPickerSheet` |
| `Avatar`, `Skeleton`, `Button` | `apps/mobile/components/ui/` | Large row, its loading state and its Retry |

## States

### Default
Rows as in the layout for the session state.

### Loading
Only the large row loads: a `size-12 rounded-full` skeleton with two text bars (`h-4 w-40`, `h-3 w-28`). Every other row stays visible and usable.

### Error
Only the large row fails: avatar, "Something went wrong" in `text-muted-foreground`, and an outline `Button` `size="sm"` `min-h-11` reading Retry. Every other row stays visible and usable.

### My listings total
The value shows the total of the User's Listings and drafts when it is known and above zero; otherwise the row has no value. Not built yet: see [Current app differs](#current-app-differs).

### Empty
N/A — the menu is static.

### Offline
Rows stay visible; the screens they open handle offline.

## Motion

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Row press | background to `bg-secondary` | instant | — |
| Language and Theme sheets | bottom-sheet slide | `OptionPickerSheet` default | `OptionPickerSheet` default |

Reduced motion: the sheet follows the system setting.

## Accessibility

- **Tap targets**: rows are at least 56px high; the large row 76px; Retry 44px.
- **Screen reader**: each row is a button whose label reads the label, then the second line, then the value (for example "Language, English").
- **Loading**: the large-row skeleton is one element labelled with `common:loading`.
- **Error**: the failed large row has the `alert` role.
- **Reading order**: title → large row → My listings → Notifications → Language → Theme → Help → Terms of Service → Privacy Policy → Posting rules → About the app.

## Trilingual copy

| Key | RU | TK | EN |
|---|---|---|---|
| `common:cabinet` | Кабинет | Kabinet | Cabinet |
| `common:signIn` | Войти | Giriş | Sign in |
| `account:signInSub` | По телефону или почте | Telefon ýa-da e-poçta bilen | By phone or email |
| `account:myListings` | Мои объявления | Bildirişlerim | My listings |
| `account:notifications` | Уведомления | Habarnamalar | Notifications |
| `account:language` | Язык | Dil | Language |
| `account:theme` | Тема | Tema | Theme |
| `support:help` | Помощь | Kömek | Help |
| `account:termsOfService` | Условия использования | Ulanyş şertleri | Terms of Service |
| `account:privacyPolicy` | Политика конфиденциальности | Gizlinlik syýasaty | Privacy Policy |
| `account:postingRules` | Правила размещения | Ýerleşdirme düzgünleri | Posting rules |
| `support:about` | О приложении | Programma hakda | About the app |

`apps/mobile/src/i18n/resources.ts` is the source for these strings.

## Implementation notes

- Signed in, the large row opens Profile; signed out, it opens sign-in with Cabinet as the return route.
- Legal rows open the localized web page for the current language; they do not deep-link into the app.
- Help is the release's only support entry. The code screen links to it only at the daily Sign-in Code limit ([mobile OTP login flow](mobile-otp-login-flow.md)).
- Log out and a finished account deletion land on Cabinet, signed out.
