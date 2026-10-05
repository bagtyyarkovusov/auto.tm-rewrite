# Hi-Fi — Mobile Cabinet Tab

> Maps to: `apps/mobile/app/(tabs)/services.tsx` (Tab 5; the route keeps its `services` name)
> Derived from wireframe: `docs/prd/ui/wireframes/mobile-tabs-services.md`
> Governed by: [20 — Information architecture, Tab 5 — Cabinet menu](../../20-information-architecture.md#tab-5--cabinet-menu), the founder's [screen map amendment](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/344#issuecomment-5947347989) and the [#353 decisions](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/353#issuecomment-5946561929). This page describes what the app does on `main`; the information architecture's Tab 5 lists My listings first, and the app lists Notifications first.
> History: this page first specified a "Services" list with Profile, Settings, Bortzhurnal and Help & Support rows (#124, design archive `app-shell.html`). The 2026-10-02 amendment removed the Settings screen; that design is retired and not kept here.

==============================================
HIGH-FIDELITY DESIGN — Mobile Cabinet Tab
Platform: mobile
Mode: light + dark
==============================================

## Purpose

Cabinet is a plain menu in Auto.ru's manner. Rows never block on the network: the profile row swaps to a skeleton while `/me` loads, and the My listings total appears when its count arrives; every row is visible and usable the whole time. There is no Settings screen, no gear and no "List a car" row.

## Layout

```text
┌────────────────────────────────────────────┐
│ safe-top                                   │
│ Cabinet                                    │
├────────────────────────────────────────────┤
│ (A)  Display name                     >    │  large row, 76px; avatar 48pt
│      +993 6X XX-XX-42                      │  masked Sign-in Method
│░░░░░░░░░░░░░░░░ gap 8px ░░░░░░░░░░░░░░░░░░░│
│ ▣  Notifications                      >    │  signed in only
│ ── divider ──────────────────────────────  │
│ ▣  My listings                        5 >  │  signed in only; total of
│                                            │  Listings + drafts, no 0
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

Signed out, the large row reads "Sign in" / "By phone or email" with a neutral person avatar (a `User` icon, never a car), and the Notifications and My listings group is absent.

Signed in, the large row is the profile row: a 48 pt `UserAvatar` — the User's profile photo, or the car mark the server assigned (`avatarIndex`) on a tinted circle, so the circle is never empty — then the Display Name on one line (the name the User set, or their Generated Name, "Водитель 4821" / "Sürüji 4821" / "Driver 4821" in the reader's language; a 30-character name ends in "…"), then the masked Sign-in Method. The row opens Profile.

The My listings value is the total of the User's Listings and drafts. While the count loads or fails, and when it is zero, the row shows no number; it opens My listings either way and refreshes the count when Cabinet regains focus.

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
- Row icon: Lucide, `size-6 text-muted-foreground` — `Bell` (Notifications), `List` (My listings), `Globe` (Language), `Contrast` (Theme), `CircleHelp` (Help), `ShieldCheck` (Terms of Service), `FileText` (Privacy Policy), `ScrollText` (Posting rules), `Info` (About the app)
- Large row signed in: `UserAvatar` at 48 pt — the profile photo, or the assigned car mark on a tinted circle (`apps/mobile/components/identity/UserAvatar.tsx`)
- Large row signed out or failed: neutral person `Avatar` `size-12` with a `User` icon; never a car
- Chevron: `ChevronRight`, `size-[18px] text-muted-foreground opacity-60`, on the large row, Notifications and My listings only. Language, Theme, Help, the legal rows and About have none, including Help and About, which also open app screens

## Component shape

The screen composes the shared account rows; it adds no new primitive.

| Component | File | Use |
|---|---|---|
| `MenuRow`, `MenuDivider`, `MenuGap` | `apps/mobile/components/account/MenuRow.tsx` | Every row, divider and group gap; shared with Profile |
| `MyListingsRow` | `apps/mobile/components/account/MyListingsRow.tsx` | My listings row with the Listings + drafts total; refetches on focus |
| `UserAvatar` | `apps/mobile/components/identity/UserAvatar.tsx` | The signed-in large-row avatar at 48 pt; Profile reuses it at 72 pt |
| `LanguageRow`, `ThemeRow` | `apps/mobile/components/account/` | Rows with the current value; each opens `OptionPickerSheet` |
| `Avatar`, `Skeleton`, `Button` | `apps/mobile/components/ui/` | Neutral signed-out avatar, the profile row's loading state and its Retry |

## States

### Default
Rows as in the layout for the session state.

### Loading
Only the large row loads: a `size-12 rounded-full` skeleton with two text bars (`h-4 w-40`, `h-3 w-28`). Every other row stays visible and usable. The My listings row shows no number until its count arrives.

### Error
Only the large row fails: neutral person avatar, "Something went wrong" in `text-muted-foreground`, and an outline `Button` `size="sm"` `min-h-11` reading Retry. Every other row stays visible and usable. The My listings row shows no number when its count fails.

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
- **Screen reader**: each row is a button whose label reads the label, then the second line, then the value (for example "Language, English"). On the signed-in large row the avatar carries no label of its own — the name beside it is what the screen reader hears.
- **Loading**: the large-row skeleton is one element labelled with `common:loading`.
- **Error**: the failed large row has the `alert` role.
- **Reading order**: title → large row → Notifications → My listings → Language → Theme → Help → Terms of Service → Privacy Policy → Posting rules → About the app.

## Trilingual copy

| Key | RU | TK | EN |
|---|---|---|---|
| `common:cabinet` | Кабинет | Kabinet | Cabinet |
| `common:signIn` | Войти | Giriş | Sign in |
| `account:signInSub` | По телефону или почте | Telefon ýa-da e-poçta bilen | By phone or email |
| `account:notifications` | Уведомления | Habarnamalar | Notifications |
| `account:myListings` | Мои объявления | Bildirişlerim | My listings |
| `account:language` | Язык | Dil | Language |
| `account:theme` | Тема | Tema | Theme |
| `support:help` | Помощь | Kömek | Help |
| `account:termsOfService` | Условия использования | Ulanyş şertleri | Terms of Service |
| `account:privacyPolicy` | Политика конфиденциальности | Gizlinlik syýasaty | Privacy Policy |
| `account:postingRules` | Правила размещения | Ýerleşdirme düzgünleri | Posting rules |
| `support:about` | О приложении | Programma hakda | About the app |

`apps/mobile/src/i18n/resources.ts` is the source for these strings. The Generated Name is not a resource string: its prefix comes from `GENERATED_NAME_PREFIX` in `packages/contracts/src/schemas/identity.ts` (RU "Водитель", TK "Sürüji", EN "Driver") plus the number the server assigned the User (1000–9999).

## Implementation notes

- Signed in, the large row opens Profile; signed out, it opens sign-in with Cabinet as the return route. Profile shows the same avatar at 72 pt with the Display Name under it, also on one line.
- The My listings total counts Listings and drafts together; it is hidden while loading or failed and when it is zero, and it refreshes when Cabinet regains focus.
- Legal rows open the localized web page for the current language; they do not deep-link into the app.
- Help is the release's only support entry. The code screen links to it only at the daily Sign-in Code limit ([mobile OTP login flow](mobile-otp-login-flow.md)).
- Log out and a finished account deletion land on Cabinet, signed out.
