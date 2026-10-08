# Mobile: first-run onboarding hi-fi

## Status, purpose, and sources

**Status: redesign proposal. Nothing here has shipped.** No app code changed with this document.

Purpose: a person who has just installed AutoTM picks a language, sees in three screens what the app does today, and lands on Home without signing in. The current onboarding is three text-only screens with no pictures and with claims the app cannot back; the founder asked for a clearer flow with graphics, in AutoTM's own look.

| Artifact | Path |
|---|---|
| Preview (open in a browser, no network needed) | [preview/mobile-onboarding.html](preview/mobile-onboarding.html) |
| Screenshots of the preview | [RU](preview/mobile-onboarding-ru.png), [TK](preview/mobile-onboarding-tk.png), [EN](preview/mobile-onboarding-en.png) |
| Illustrations (original SVG) | [assets/onboarding/](assets/onboarding/) |

Sources read, in authority order:

- [ADR-0051](../../../adr/0051-auto-ru-inspired-mobile-discovery-before-google-play-review.md): anonymous browsing and AutoTM tokens stay; Auto.ru is a journey reference, not a visual template. [ADR-0034](../../../adr/0034-kolesa-ux-findability-reference.md) item 5 set "language picker + 1–2 skippable slides → anonymous feed"; this proposal uses three slides, which needs the founder's yes (see Open decisions).
- Source at `origin/main` `4397b3c2`: `apps/mobile/app/(onboarding)/{_layout,index,language,value-prop}.tsx`, `apps/mobile/src/auth/LocaleSwitcher.tsx`, `apps/mobile/src/onboarding/onboardingFlag.ts`, `apps/mobile/app/_layout.tsx`, `apps/mobile/src/i18n/resources.ts`.
- Tokens: `packages/ui/tokens/mobile.ts`, `apps/mobile/global.css`, [71](../71-design-tokens.md), [72](../72-light-and-dark.md), [73](../73-typography.md), [75](../75-illustration-style.md), [76](../76-motion.md).
- References, viewed only: Auto.ru `44-first-login` (3 images), `43-auth`, `01-home-feed`; Kolesa `52-onboarding`. No image, artwork, colour or wording from either is in this repository.

### What the references actually show

The saved Auto.ru first-login set is a red splash with the wordmark and a slogan, the system notification prompt, then Home. It has no illustrated slides. Kolesa's set is a wordmark splash, a two-button language choice on a full brand-colour screen, then Home with a tracking prompt. The graphics the founder remembers are most likely Auto.ru's rendered cars on Home. What this proposal takes from them is structural: language first (Kolesa), then straight into browsing with no sign-in (both). It deliberately does not take the permission prompt on first launch.

### When a fresh install sees onboarding today

From source, **it does not**. PR 760 changed the root `initialRouteName` from `(onboarding)` to `(tabs)` and removed the `Stack.Protected` guard, the completion subscription and the readiness gate ([issue 757 record](../../../evidence/issue-757/verification.md), fix-round item 4). On `origin/main` nothing navigates to `/(onboarding)`: the only links into the group are inside it. `(onboarding)/index.tsx` still reads the flag and redirects, but it is reached only if a navigation targets it. `test/routes/onboarding-back.spec.tsx` asserts the root mounts `(tabs)` without reading the onboarding flag.

Two caveats. This was not run on a device for this document (an emulator pass was using the machine). And `(onboarding)/index` and `(tabs)/(search)/index` both resolve to `/`, so which one a cold start opens rests on Expo Router preferring the `initialRouteName` group; the Android screenshot of the language screen taken on 2026-10-08 may predate PR 760 or may contradict this reading. Confirm on a fresh install before implementation. `apps/mobile/CONTEXT.md` line 21 still describes the removed `Stack.Protected` guard and needs correcting in the implementation PR.

### Problems in the current screens

1. Three screens of text with no picture; the third has one small shield icon. Nothing tells the screens apart at a glance.
2. Copy promises what does not exist: "VIN history", "honest condition disclosures", "AutoTM inspections coming in pilot", "verified-phone sellers", contacting sellers "safely".
3. The language control shows codes (`TK RU EN`) in a small segmented control, left-aligned in a wide grey bar, not language names.
4. Skip sits under the main button, at the very bottom, next to the system navigation bar.
5. The splash screen is hard-coded white (`bg-white`, dark status-bar text) in an app that defaults to dark.

## Flow

```text
cold start ── flag set ─────────────────────────────► Home (tabs)
     │
     └─ flag not set ► Language ► Find ► Chat ► Sell ► Home (tabs)
                                  └──── Skip ────────► Home (tabs)
```

- **Language** (`/(onboarding)/language`): three rows with language names. Tapping a row switches the whole screen at once. Continue goes on.
- **Find, Chat, Sell** (`/(onboarding)/value-prop`, one route, three pages in a horizontal pager): swipe or Next. Skip is in the top bar on pages 1 and 2.
- **Leaving**: Skip and the last button do the same thing: store the flag, then `router.replace(HOME_HREF)`. The person arrives signed out and can browse. Nothing in onboarding asks for sign-in, notifications, photos, camera or location.
- **Back**: on page 2 or 3, the header button and Android Back go to the previous page. On page 1 they return to Language. On Language, Android Back leaves the app (system default); the screen has no Back button.

## Layout and responsive/safe-area behavior

All sizes are dp. Both screens sit in `SafeScreen`, which pads all four insets; screen padding goes on a `flex-1` View inside it (`test/routes/onboarding-padding.spec.tsx`). Nothing is absolutely positioned, so Android gesture navigation (inset about 24) and 3-button navigation (inset 48) both push the footer up and the main button is never under the system bar. The same applies to the iOS home indicator.

### Language

```text
┌──────────────────────────────────────┐
│ status bar inset                     │
│ auto.tm wordmark              h 48   │  px-6, wordmark 22 high
│ ┌──────────────────────────────────┐ │
│ │  [TK]   [EN]                     │ │  illustration panel
│ │     [ RU ]  ← chosen, red        │ │  flex-1, min-h 96
│ │   car on a ground line           │ │  mx-6 mt-1 mb-5, p-3
│ └──────────────────────────────────┘ │  bg-card rounded-3xl
│ Выберите язык            text-title  │  px-6
│ Вы можете изменить…      text-body   │  mt-2, muted
│ ┌──────────────────────────────────┐ │  mt-4 mx-6
│ │ Türkmençe                      ○ │ │  bg-card rounded-2xl
│ │ Русский                        ● │ │  3 rows × h-control-lg (56)
│ │ English                        ○ │ │  px-5, inset divider
│ └──────────────────────────────────┘ │
│ [          Продолжить             ]  │  pt-4 px-6 pb-4, pill 56
│ navigation bar inset                 │
└──────────────────────────────────────┘
```

### Find / Chat / Sell

```text
┌──────────────────────────────────────┐
│ status bar inset                     │
│ (‹)                     Пропустить   │  h 48, px-4; back 44 circle
│ ┌──────────────────────────────────┐ │
│ │                                  │ │  illustration panel
│ │          illustration            │ │  flex-1, min-h 96
│ │                                  │ │  mx-6 mt-1 mb-5, p-3
│ └──────────────────────────────────┘ │  bg-card rounded-3xl
│ Найдите машину           text-title  │  px-6, up to 3 lines
│ по марке и модели                    │
│ Смотрите объявления…     text-body   │  mt-3, muted, up to 4 lines
│                                      │  text block min-h 146
│ ━━ • •                               │  pt-6 px-6; dots h 6, gap 6
│ [             Далее               ]  │  mt-5, pill 56; pb-4
│ navigation bar inset                 │
└──────────────────────────────────────┘
```

Rules that hold on every size:

- The illustration panel is the only flexible element. Text, rows, dots and buttons keep their size; the panel takes what is left and the artwork scales inside it with its aspect ratio (304 × 248), centred.
- The top bar and the footer (dots and button) stay fixed while pages swipe; only the panel and text move. Skip keeps its space on page 3 but is not rendered as a control there, so the bar does not jump.
- The text block reserves 146 dp (two title lines, three body lines) so the dots do not move between pages. Longer text grows upward into the panel's space.
- Text is left-aligned, like Home's headings. Titles use balanced wrapping where the platform supports it; no manual line breaks in strings.

| Window | Behaviour (checked in the preview) |
|---|---|
| 360 × 780, gesture nav | Reference layout. Panel about 390 high on slides, 300 on Language. |
| 360 × 640, 3-button nav | Everything fits without scrolling. Panel shrinks to about 225 on slides and about 135 on Language. |
| 412 × 915 | Panel grows; artwork scales to the panel width (about 340). No max width below 480. |
| Width ≥ 600 (tablet, landscape) | Content column capped at 480, centred. |
| Usable height < 520, or font scale ≥ 1.3 | See Large text below. |

## Token map (light and dark)

Values are from `apps/mobile/global.css`.

| Element | Utility | Light | Dark |
|---|---|---|---|
| Page | `bg-background` | `#F3F3F1` | `#0F0F10` |
| Illustration panel, language rows | `bg-card` | `#FFFFFF` | `#1B1B1D` |
| Panel radius | `rounded-3xl` | 28 | 28 |
| Rows card radius | `rounded-2xl` | 24 | 24 |
| Row divider (inset 20 each side) | `border-border` | `#E2E2DF` | `#2F2F32` |
| Title | `text-title font-heading font-bold text-foreground` (28/34, -0.3) | `#171717` | `#FAFAF9` |
| Body, subtitle | `text-body text-muted-foreground` (16/22) | `#666666` | `#A5A5AC` |
| Row label | `text-body font-medium text-foreground`; chosen row `font-semibold` | | |
| Radio, not chosen | 24 circle, `border-2 border-border` | `#E2E2DF` | `#2F2F32` |
| Radio, chosen | 24 circle `bg-primary`, white check 14, stroke 3 | `#E60000` | `hsl(0 90% 52%)` |
| Back button | 44 circle `bg-secondary`, `ChevronLeft` 22 `text-foreground` | `#E7E7E4` | `#2A2A2D` |
| Skip | `text-callout font-medium text-muted-foreground`, `min-h-12 px-2` | `#666666` | `#A5A5AC` |
| Dot, current | 24 × 6 `rounded-full bg-foreground` | `#171717` | `#FAFAF9` |
| Dot, other | 6 × 6 `rounded-full bg-muted-foreground/40` | | |
| Main button | `Button variant="brand" size="pill"` (56, pill) | `#E60000` / white | `hsl(0 90% 52%)` / white |
| Illustration ink | SVG `color` = foreground | `#171717` | `#FAFAF9` |
| Illustration accent | literal in the SVG | `#E60000` | `#E60000` |
| Status bar | `expo-status-bar` style from the scheme | dark icons | light icons |

Dots use the foreground, not red: red is kept for the one action on the screen and the one accent in the picture.

The splash route (`(onboarding)/index.tsx`) changes from `bg-white` to `bg-background` and takes its status-bar style from the scheme, so a dark-mode start does not flash white.

## Illustrations

Six original SVG files, hand-authored for this proposal, in [assets/onboarding/](assets/onboarding/):

| File | Screen | Picture |
|---|---|---|
| `onboarding-language-tk.svg`, `-ru.svg`, `-en.svg` | Language | Three number plates reading TK, RU and EN above a car. The chosen language is the red plate in front; one file per choice. |
| `onboarding-find.svg` | Find | A search field and a Listing card with a car, under a red magnifier; a second card peeks in from the right. |
| `onboarding-chat.svg` | Chat | Two chat bubbles above a car: the seller's in tone, the buyer's in red. |
| `onboarding-sell.svg` | Sell | A car inside camera framing corners, two photo tiles, an empty tile and the red add button from the Sell tab. |

Style, so later illustrations match:

- One car, drawn the same way in all four, as the recurring subject.
- Ink is `currentColor`: 3 dp rounded strokes (2.5 on small parts). Tonal shapes are `currentColor` at 7–20% opacity, so one file reads on the light and the dark panel with no second variant.
- Exactly one solid red element per picture, plus the car's red headlight. White appears only on red.
- Flat. No gradients, shadows, 3D, characters or text set in a font. The plate letters are Geist Bold outlines converted to paths (Geist is SIL OFL), so they do not depend on font loading.
- View box `8 6 304 248`.

This follows [75](../75-illustration-style.md) (flat, stroke-based, red used sparingly, car subject, no mascots, no 3D) with two deviations that need recording there when this ships: tonal fills in addition to strokes, and a size above its 200 × 200 limit, which was written for empty states.

**Rendering in the app.** `react-native-svg` 15.15.3 and `react-native-svg-transformer` are already installed and wired in `metro.config.js`; `assets/launch-mark.svg` is imported the same way today. Import each file as a component and pass `color` from the theme. `expo-image` is also installed but cannot recolour `currentColor`, so it is not the route. No new dependency. At implementation, move the files to `apps/mobile/assets/onboarding/`.

## Component and customization map

| Element | Component | Change |
|---|---|---|
| Screen wrapper | `SafeScreen` + inner `flex-1` View | none |
| Main button | `Button` `variant="brand"` `size="pill"` + `Text` | none |
| Back | `Button` `variant="secondary"` `size="icon"` + `Icon as={ChevronLeft}` | none |
| Skip | `Button` `variant="ghost"` with `text-muted-foreground`, or the current `Pressable`; must keep `min-h-12` | call-site classes |
| Language rows | New `components/onboarding/LanguageRows.tsx`: `radiogroup` of three `PressableScale` rows | new feature component. `LocaleSwitcher` stays as it is for the sign-in screens |
| Pager | `Animated.ScrollView` from Reanimated, `horizontal pagingEnabled`, three pages of window width | new, no dependency |
| Dots | New `components/onboarding/PagerDots.tsx`, widths driven by the scroll offset | new |
| Illustration panel | View `bg-card rounded-3xl` + imported SVG component | new |

## Page-state matrix

| State | Behaviour |
|---|---|
| Default | As specified. |
| Loading | The only wait is reading the flag on the splash route: wordmark on `bg-background`, no spinner. Screens have no data to load. |
| Empty | N/A: no lists or user data. |
| Error | Reading the flag fails or takes over 1 s: go to Home, do not show onboarding, log a warning. Writing the flag fails on Skip/finish: still go to Home; onboarding may show once more next start. Onboarding never blocks the app. |
| Offline | N/A: onboarding makes no network request. Home handles offline after it. |
| Returning user | Flag set: onboarding is not shown and its routes are not reachable from Back. Language stays changeable in Cabinet. |
| Signed-in session with no flag (reinstall is impossible; update from a build that never showed onboarding) | Depends on the gate decision below. Recommended: a stored locale or an existing session counts as "already onboarded" and the flag is written silently, so people already using the app are not interrupted after an update. |
| Deep link or push on first start | The link wins: open its target, do not show onboarding in front of it, and leave the flag unset so onboarding shows at the next plain cold start. |
| App killed mid-flow | Flag not set, so the next start begins at Language with the chosen language kept. |

## Interaction-state and microinteraction matrix

| Interaction | Trigger | Rules | Feedback | Loop/mode | Recovery |
|---|---|---|---|---|---|
| Choose language | Tap a 56 dp row | `localeStore.setLocale`; one row always chosen; tapping the chosen row does nothing. First paint preselects the resolved locale (stored, else device, else `ru`) | Row press tone (`bg-accent`) under 100 ms; check moves; title, subtitle, button and picture change language at once; selection haptic | Stays until changed; no hidden mode | Tap another row |
| Continue | Tap main button | Push value-prop page 1. Language is already stored by the row tap | `PressableScale` control press (0.96) | | Back returns to Language |
| Next | Tap main button on page 1–2 | Scroll the pager one page. Taps during a scroll are ignored until it settles | Press scale; pages slide; dots follow | | Back button, Android Back or swipe right |
| Swipe | Horizontal drag on the page area | Paging snaps to a page; no overscroll past page 1 or 3; swiping left on page 3 does not finish | Dots track the finger | | Swipe back |
| Skip | Tap Skip (pages 1–2) | Store flag, replace to Home. Second tap ignored once started | Press tone; Home appears | Ends onboarding for good | Nothing to undo; the same content is not gated anywhere |
| Finish | Tap main button on page 3 | Same as Skip | Press scale; Home appears | Ends onboarding | |
| Back | Header button or Android Back | Page 3→2→1→Language; Language → leave app | Pages slide back | | |

Pressed, disabled and focus: the main button is never disabled. There is no validation, permission, optimistic or retry state on these screens.

## Motion and reduced motion

Transform and opacity only, on the UI thread, with tokens from `apps/mobile/lib/motion.ts`.

| Element | Motion |
|---|---|
| Language → value-prop, and back | The group's existing `fade` stack animation. |
| Pages | Native paging scroll for swipes. Next and Back call `scrollTo({ animated: true })`. |
| Dots | Each dot's width (6↔24) and opacity (0.4↔1) interpolate from the scroll offset, so they move with the finger rather than after it. |
| Illustration entrance | When a page becomes current for the first time: opacity 0→1 and translateY 12→0, `duration.base` (250 ms), `easing.enter`. Title and body follow 60 ms later with the same curve. Plays once per page per visit, not on every swipe back. |
| Language picture | On choosing a language the three files cross-fade, `duration.fast` (150 ms). |
| Main button label (Next → Browse listings) | Text swap with a 150 ms cross-fade; the button does not resize. |
| Leaving to Home | `router.replace`; default stack transition. |

No looping animation, no autoplay between pages, no delay before a control works.

**Reduce Motion on** (`useReduceMotion()`): no entrance offset or fade, pictures and labels switch instantly, Next and Back use `scrollTo({ animated: false })`, dots jump. Swiping still pages, because that is direct manipulation.

## Large text, small windows

- Text scales with the system font setting. Controls keep their height and grow if the label wraps (`min-h` rather than `h` on the main button at font scale above 1.3).
- When the usable height is under 520 dp or the font scale is 1.3 or more, the illustration panel is dropped and the title and body sit in a vertical `ScrollView` between the fixed top bar and the fixed footer. The preview's "font scale 1.3" frame shows this. Words over pictures when both cannot fit.
- On Language at the same threshold, the panel is dropped first, then the subtitle scrolls with the rows; the Continue button stays pinned.
- Skip is never truncated: at large sizes it may take the full bar width beside the Back button.

## Accessibility

- **Contrast.** Title `#171717` on `#F3F3F1` 16:1, `#FAFAF9` on `#0F0F10` 18:1. Body `#666666` on `#F3F3F1` 5.2:1, `#A5A5AC` on `#0F0F10` 7.8:1. Button: white on `#E60000` 4.8:1. In dark the button is `hsl(0 90% 52%)` (about `#F31616`), where white is 4.3:1 at 16 dp semibold, under the 4.5:1 line; this is the existing `brand` button, not new here, and is listed under findings. Illustration red on the dark panel is 3.6:1; the pictures carry no information that the text does not.
- **Targets.** Rows 56 high, full width. Main button 56. Back 44 with `hitSlop` 2 to reach 48 on Android. Skip `min-h-12` (48) and at least 48 wide.
- **Roles and labels.** Rows: `radiogroup` labelled with the localized "Language" (today `LocaleSwitcher` hard-codes the English word), each row `radio` with `checked`, label the language's own name. Title: `accessibilityRole="header"`. Pager: the three dots are one element with a plain text label, "Page 2 of 3"; it is not a progress bar and not adjustable. Illustrations and the panel: `accessible={false}` and hidden from the tree, since the title says the same thing.
- **Order.** Language: wordmark (label "AutoTM"), title, subtitle, rows, Continue. Slides: Back, Skip, title, body, page label, main button. Pages that are off screen are hidden from the accessibility tree (`importantForAccessibility="no-hide-descendants"`, `accessibilityElementsHidden`).
- **Announcements.** After a page change by button, move focus to the new title. After choosing a language, announce the row's new state in the newly chosen language.
- **Not colour alone.** The chosen row has a check and heavier label, not just red. The current dot is longer, not just brighter.
- **Screen reader swipe.** With TalkBack or VoiceOver on, two-finger swipe pages; Next and Back are always available as buttons, so the pager never needs a gesture.
- **Verification.** TalkBack on Android and VoiceOver on iOS through the whole flow in each language; font scale 1.3 and 2.0; Reduce Motion; light and dark; 360 × 640 with 3-button navigation.

## Trilingual copy and i18n keys

All new strings below are **PROPOSED: native review required** for Turkmen and Russian. Namespace `onboarding` unless a namespace is given.

| Key | EN | RU | TK |
|---|---|---|---|
| `chooseLanguage` (exists) | Choose language | Выберите язык | Dil saýlaň |
| `languageSubtitle` (exists) | You can change the language later in Cabinet | Вы можете изменить язык позже в Кабинете | Soňrak Kabinetde üýtgedip bilersiňiz |
| `common:continue` (exists) | Continue | Продолжить | Dowam et |
| `common:next` (exists) | Next | Далее | Indiki |
| `common:skip` (exists) | Skip | Пропустить | Geç |
| `common:back` (exists, Back button label) | Back | Назад | Yza |
| `findTitle` (new) | Find a car by make and model | Найдите машину по марке и модели | Awtoulagy marka we model boýunça tapyň |
| `findBody` (new) | Browse listings and narrow them by price, year and city. You don't need an account to look. | Смотрите объявления и уточняйте поиск по цене, году и городу. Аккаунт для просмотра не нужен. | Bildirişlere serediň, baha, ýyl we şäher boýunça süzüň. Görmek üçin akkaunt gerek däl. |
| `chatTitle` (new) | Write to the seller directly | Пишите продавцу напрямую | Satyja göni ýazyň |
| `chatBody` (new) | Ask about the car in the in-app chat. You sign in only when you decide to write. | Задавайте вопросы о машине в чате приложения. Войти нужно, только когда решите написать. | Awtoulag barada soraglaryňyzy programmadaky çatda beriň. Diňe ýazmak isläniňizde girmeli bolar. |
| `sellTitle` (new) | Sell your car for free | Продайте машину бесплатно | Awtoulagyňyzy mugt satyň |
| `sellBody` (new) | Add photos, set a price and publish. Posting a listing costs nothing. | Добавьте фото, укажите цену и опубликуйте. Размещение объявления бесплатное. | Surat goşuň, bahasyny görkeziň we neşir ediň. Bildiriş ýerleşdirmek mugt. |
| `finish` (new; same wording as the existing `browseListings`) | Browse listings | Смотреть объявления | Bildirişlere seret |
| `pageOf` (new, screen reader only) | Page {{current}} of {{total}} | Страница {{current}} из {{total}} | Sahypa {{current}} / {{total}} |
| `languageGroup` (new, screen reader only; or reuse the account "Language" key) | Language | Язык | Dil |

Language names are not translated: `Türkmençe`, `Русский`, `English`, from `localeNames` in `resources.ts`, in that order.

Strings I am least sure of, for the native reviewer:

- TK `chatBody`: "Diňe ýazmak isläniňizde girmeli bolar" is my construction for "you only need to sign in when you want to write". The app uses "giriň" for "sign in"; a native speaker should confirm this reads naturally.
- TK `sellBody`: "Bildiriş ýerleşdirmek mugt" ("placing a listing is free"). "neşir ediň" follows the app's existing "Neşir et" (Publish).
- TK `common:next` "Indiki" already exists but reads as "the next one"; "Dowam et" may be the more natural button. Not changed here.
- TK `findTitle` is the longest title (two lines at 360 dp, checked). "Awtoulag" follows the Sell flow's wording; the old onboarding said "awtomobil".
- RU uses "машина", as the old onboarding did; the Sell flow says "автомобиль". "Машина" is shorter and warmer for a first screen. Founder's call.
- RU `languageSubtitle` and TK equivalent are kept as they are.

Every claim maps to something the app does now: anonymous browsing and Brand/model search with price, year and city filters (ADR-0051, `resultsRemove_city/price/year`); in-app Conversations with sign-in asked at the action; a Listing with photos and a price published from the Sell tab. "Free" rests on the brief for this work; if posting ever costs money, `sellTitle` and `sellBody` change first.

Keys to delete when this ships: `valueProp1Title` … `valueProp3Body`, `getStarted`. They contain the claims about VIN history, inspections, verified sellers and safety.

Long text: the longest strings are TK `findTitle` (two lines) and RU `chatBody` (three lines at 360 dp). The layout allows three title lines and four body lines before the panel starts to shrink. No numbers, dates, currency or phone numbers appear.

## UX scores and severity findings

| Dimension | Score | Why not 10 |
|---|---|---|
| Heuristic usability | 8.5 | The three slides are still a detour before content; a person who wants to browse must tap Skip or four buttons. Reaching 10 would mean showing these messages inside Home instead (see alternatives). |
| Discoverability and error tolerance | 9 | Skip, Back and the page position are all visible. Nothing here can be done wrong. One point off because a skipped onboarding cannot be seen again. |
| Microinteraction quality | 8 | Language switching live with the picture following is good feedback. Not yet verified on a device: dot tracking smoothness on low-end Android, haptic feel. |

| # | Finding | Severity (0–4) | Resolution |
|---|---|---|---|
| 1 | Old copy claims features that do not exist | 3 | Resolved by the new copy |
| 2 | Onboarding is not reachable on a fresh install today | 3 for this redesign's value | Not resolved by design; needs the gate decision below before implementation |
| 3 | Skip beside the system navigation bar | 2 | Resolved: moved to the top bar |
| 4 | White splash in a dark app | 2 | Resolved in this spec |
| 5 | White on the dark-mode brand red is 4.3:1 at 16 dp | 1 | Existing `brand` button, app-wide; out of scope here, worth its own change |
| 6 | Language artwork at 360 × 640 is small (about 110 dp high) | 1 | Accepted; the rows are the content on that screen |
| 7 | Three slides against ADR-0034's "1–2" | 1 | Founder decision below |

No open severity 3–4 finding in the design itself. Finding 2 blocks implementation, not this document.

## Implementation notes

- Files touched later: `app/(onboarding)/{index,language,value-prop}.tsx`, new `components/onboarding/*`, `src/i18n/resources.ts`, `assets/onboarding/*.svg`, `apps/mobile/CONTEXT.md`.
- Tests that must change with it: `test/routes/onboarding-value-prop.spec.ts` asserts the `ShieldCheck` trust slide and the `valueProp3` key, both removed here. `test/routes/onboarding-padding.spec.tsx` keeps passing if padding stays on the inner View. `test/routes/onboarding-back.spec.tsx` constrains the gate (below).
- The pager is one route. Keep the current page index in component state; Android Back is handled with `BackHandler` while the index is above 0.
- Measure the window with `useWindowDimensions` for page width and for the 520 dp and 600 dp thresholds; read `PixelRatio.getFontScale()` for the 1.3 threshold.
- Follow `docs/agents/mobile-expo.md` and `docs/agents/nativewind-v4.md` for verification. This document's layout was checked only in a browser mockup; device evidence in light and dark on Android and iOS is still owed.

### The gate (how a fresh install reaches onboarding)

PR 760 removed the gate for two reasons that any new gate must respect: the storage read must not block navigation from mounting, and `(tabs)` must stay the Back anchor so onboarding is never underneath Home.

Recommended shape, to be confirmed by whoever implements: the root keeps mounting `(tabs)` first. Home's first frame is held behind the native splash, which is already kept until fonts and i18n are ready. In that same window the flag is read with a 1 s timeout; if it is unset, and there is no stored locale and no session, the app pushes `/(onboarding)/language` above the tabs before the splash hides. Finishing or skipping replaces to Home. A failed or slow read means no onboarding. This keeps `initialRouteName: "(tabs)"`, never leaves onboarding in the Back history after it ends, and cannot strand a start on a storage read. The assertion in `onboarding-back.spec.tsx` that the flag is not read before the Stack mounts would stay true only if the read happens in a child effect; that test needs a deliberate update either way.

## Alternatives considered

- **No slides: language choice, then Home with first-run hints in place.** The least interruption and the most honest about value (the Listings are the value). Rejected for this proposal because the founder asked for an illustrated onboarding; worth revisiting if Skip rates are high.
- **One slide with three bullet points.** Faster, but gives each message a third of the attention and leaves room for one small picture only.
- **Language as page 1 of the same pager.** Removes one transition, but a language change re-renders every page mid-swipe and Skip on a language choice makes no sense.
- **Full-bleed brand-red first screen, like the references' splash.** Strong, but it is their look, and red is kept for actions in AutoTM.

## Open decisions (must be empty or explicitly deferred)

Deferred to the founder; none blocks reading this spec, and 1 blocks implementation:

1. **Turn onboarding back on for fresh installs?** It is off today (by source reading). If yes, accept the gate shape above or ask for another.
2. **Three slides or two?** ADR-0034 said one or two. Three are proposed (Find, Chat, Sell). Dropping one means dropping Sell or merging Chat into Find.
3. **People already using the app** would see onboarding once after the update unless a stored locale or session counts as done (recommended). Confirm.
4. **Copy**: native review of the TK and RU strings; "машина" or "автомобиль"; confirm that posting a Listing is free and stays free.
5. **Record the illustration style** (tonal fills, larger size) in [75](../75-illustration-style.md) when this ships, or redraw as strokes only.
