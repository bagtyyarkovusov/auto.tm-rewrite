# Issue #124 — Design Visual Evidence

## Design screen → Native route/component mapping

| Design HTML | Native Route / Component | Status |
|---|---|---|
| `app-shell.html` | `app/(tabs)/_layout.tsx` + `AutoTmTabBar.tsx` | PASS — tab bar styling, active/inactive tints, central sell pill, icon/label sizing match design |
| `screens/00-sell-entry.html` | `app/(tabs)/sell.tsx` (entry state) | PASS — draft card with progress, Continue/New listing buttons, Start listing CTA |
| `screens/01-phone.html` | `app/(auth)/phone.tsx` | PASS — close + locale, brand logo, title, phone input with +993 prefix, Get code CTA, legal text |
| `screens/02-otp.html` | `app/(auth)/otp.tsx` | PASS — back/close, brand logo, OTP cells, error copy, resend countdown |
| `screens/01-vin.html` | `src/listings/wizard/Step1Vin.tsx` | PASS — title, VIN input, optional helper |
| `screens/02-photos.html` | `src/listings/wizard/Step2Photos.tsx` | PASS — Camera/Library buttons, photo grid, upload overlays |
| `screens/03-vehicle.html` | `src/listings/wizard/Step3VehicleId.tsx` | PASS — Brand/Model/Generation pickers, Year input |
| `screens/04-specs.html` | `src/listings/wizard/Step4Specs.tsx` | PASS — Condition toggle (pill buttons), mileage, color, body, transmission, drive, engine, power |
| `screens/05-price.html` | `src/listings/wizard/Step5Price.tsx` | PASS — Amount, currency, TMT equivalent, exchange/installment toggles |
| `screens/06-location.html` | `src/listings/wizard/Step6Location.tsx` | PASS — Region/City pickers, area/landmark input |
| `screens/07-description.html` | `src/listings/wizard/Step7DescContact.tsx` | PASS — Description, contact phone, calls/chat toggles |
| `screens/08-review.html` | `src/listings/wizard/Step8Review.tsx` | PASS — Review sections with validation icons and Edit buttons |
| `screens/09-discard.html` | `WizardLayout.tsx` → `WizardOverflowMenu.tsx` → `DiscardConfirmationDialog` | PASS — overflow menu sheet before destructive dialog |

## Native Expo constraints / deviations from exact pixel parity

1. **Fonts**: UberMoveMono WOFF2 files loaded via `expo-font`; may fall back to system mono on some Android builds if WOFF2 rendering is unsupported. OTF variants (UberMoveBold, UberMoveMedium, UberMoveText*) render natively without issue.
2. **Shadows**: Design archive uses CSS `box-shadow`; NativeWind maps these to elevation on Android and shadow props on iOS. Shadow intensity may vary slightly by platform.
3. **Progress bar**: Design shows a very thin progress bar; implemented as `h-1` (4px) with `rounded-full` which is the closest NativeWind tailwind equivalent that remains visible.
4. **OTP cells**: Design shows 1.5px border width; NativeWind `border-[1.5px]` is used. On some Android devices, fractional borders may round to 1px or 2px.
5. **Sheet/dropdown menus**: RNR Sheet and DropdownMenu primitives use native bottom-sheet behavior on iOS/Android; radius and animation may differ slightly from web CSS transitions.
6. **Photo grid**: Design shows exact 2-column grid; implemented with `flex-row flex-wrap gap-2` and `w-[48%]` per item. This adapts to container width rather than fixed pixel widths.

## Screenshots

Not captured locally — verification done via code review against design archive HTML files and lint/typecheck/test passes.

## UX audit fixes applied

| Finding | File | Fix |
|---|---|---|
| #1 Close button no fallback | `phone.tsx`, `otp.tsx` | `router.replace("/(tabs)")` fallback when `canGoBack()` false |
| #2 CTA no loading state | `phone.tsx`, `otp.tsx` | `ActivityIndicator` spinner shown during `isPending` |
| #3 Paste with +993 prefix fails | `src/auth/phone.ts` | `extractLocalPhoneDigits` strips `993` prefix and leading `0` |
| #4 OTP generic error copy | `otp.tsx` | Specific copy for wrong/expired/locked/used/rate-limited/generic |
| #5 Phone helper too aggressive | `phone.tsx` | Error only shown on blur or after 8 digits attempted |
| #8 OTP misleading cursor during load | `otp.tsx`, `OtpCells.tsx` | `disabled` prop on cells; hidden input has `editable={!disabled}` |
| #10 No overflow before discard | `WizardLayout.tsx` | `WizardOverflowMenu.tsx` sheet opens before `AlertDialog` |
