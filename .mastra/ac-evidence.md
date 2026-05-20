# Issue #124 — Acceptance Criteria Evidence

## AC 1: Design tokens from the archive are represented in the mobile theme/UI primitives

**PASS**

- `apps/mobile/global.css` — extended with gray palette (`--gray-50` → `--gray-950`, `#fafafa` → `#0a0a0a`), semantic error tokens (`--error: #F43F5E`, `--error-bg: #FFF1F2`, `--error-border: #FECDD3`), success token (`--success: #16a34a`), shadow tokens (`--shadow-card`, `--shadow-float`).
- `apps/mobile/tailwind.config.js` — mapped gray palette and semantic colors into Tailwind theme.
- `apps/mobile/lib/theme.ts` — updated with design gray values.
- `apps/mobile/components/ui/button.tsx` — added `fullWidth` size variant (`h-[52px] w-full rounded-full`), active scale transform.
- `apps/mobile/components/ui/input.tsx` — `h-[52px]`, `rounded-lg`, focus ring styling.
- Fonts: 8 Uber Move font files copied to `apps/mobile/assets/fonts/`; loaded via `useFonts` in `app/_layout.tsx`.

## AC 2: Existing tab shell matches app-shell.html

**PASS**

- `apps/mobile/app/(tabs)/_layout.tsx` — tab bar uses `tabBarActiveTintColor: '#000000'`, `tabBarInactiveTintColor: '#afafaf'`, 11px/500 labels, 24px icons.
- Sell tab uses black pill (`rounded-full bg-foreground px-5 py-1.5`) with `PlusCircle` icon per design archive.
- Created `apps/mobile/components/navigation/AutoTmTabBar.tsx` for custom tab bar behavior.
- Stub screens (index, favorites, chat, services) updated with consistent chrome.

## AC 3: Phone auth screen matches screens/01-phone.html

**PASS**

- `apps/mobile/app/(auth)/phone.tsx` — close control + locale switcher, brand logo, title group, phone input with `+993` prefix in mono font, formatted placeholder (`6X XX-XX-XX`), paste normalization (strips `+993`/`993` prefix).
- Helper text only turns red on blur or after 8 digits attempted (fixes UX audit #5).
- CTA shows `ActivityIndicator` spinner when `isSubmitting` (fixes UX audit #2).
- Close button has fallback `router.replace("/(tabs)")` if `canGoBack()` false (fixes UX audit #1).

## AC 4: OTP screen matches screens/02-otp.html

**PASS**

- `apps/mobile/app/(auth)/otp.tsx` — back/close controls, brand logo, 6-digit OTP cells, specific error copy (wrong/expired/locked/used/rate-limited/generic), resend countdown, dev code pill.
- `apps/mobile/components/auth/OtpCells.tsx` — square cells (`aspect-square`), focus ring, error shake animation, `disabled` prop for loading state.
- Auto-submit on 6th digit; cells disabled during verification (fixes UX audit #8).

## AC 5: Sell entry and wizard layout/header/footer/progress/save-status chrome match exported wizard screens

**PASS**

- `apps/mobile/app/(tabs)/sell.tsx` — entry screen redesigned with draft card (thumb, progress bar, Continue/New listing buttons) when draft exists; single "Start listing" CTA when no draft.
- `apps/mobile/src/listings/wizard/WizardLayout.tsx` — header with back button + centered route title + overflow menu button; `font-uber text-[22px] font-bold` step title; 2px black progress bar (`bg-foreground` fill); 52px rounded-full footer buttons (Back outline, Continue/Publish filled); save status indicator; error banner; discard confirmation dialog.

## AC 6: Wizard steps match corresponding exported screens without replacing real data/hooks

**PASS**

All step components use real existing hooks and state:
- `Step1Vin.tsx` — VIN input with design typography
- `Step2Photos.tsx` — Camera/Library buttons, photo grid, upload status
- `Step3VehicleId.tsx` — Brand/Model/Generation pickers + Year input
- `Step4Specs.tsx` — Condition toggle (New/Used pill buttons), mileage, color, body, transmission, drive, engine, power inputs
- `Step5Price.tsx` — Amount, currency picker, TMT equivalent, exchange/installment toggles
- `Step6Location.tsx` — Region/City pickers, area/landmark input
- `Step7DescContact.tsx` — Review summary card, description, contact phone, calls/chat toggles
- `Step8Review.tsx` — Review sections with edit buttons, validation checkmarks

All use existing catalog hooks (`useBrands`, `useModels`, etc.) and real payload state.

## AC 7: Overflow menu opens before discard confirmation

**PASS**

- Created `apps/mobile/components/listings/wizard/WizardOverflowMenu.tsx` — sheet with "Discard draft" action.
- `WizardLayout.tsx` overflow button opens the sheet first; tapping "Discard draft" then opens the `AlertDialog` confirmation.
- Discard dialog includes custom title/description props (used by edit screen too).

## AC 8: Continue/Publish disabled/loading/error/success states visually implemented

**PASS**

- `WizardFooter` in `WizardLayout.tsx` — disabled state shows `border-gray-200 bg-gray-100` with `text-gray-400`; enabled state shows `bg-foreground text-background`.
- `disabledReason` text shown below footer when primary action is disabled.
- Save status indicator shows `idle | saving | saved | error` with appropriate colors and retry button.
- Save error banner uses `bg-error-bg` / `text-error` styling.

## AC 9: Review screen includes all user-visible sections

**PASS**

- `Step8Review.tsx` includes: Vehicle, Photos, Specs, Price, Location, Description & Contact sections.
- Each section shows validation status (checkmark/error icon) and an Edit button.
- Description is displayed with `numberOfLines={2}`.

## AC 10: No functional regression

**PASS**

- `vehicleFieldErrorVisibility.spec.ts` — 3 tests pass.
- `useWizardAutosave.spec.tsx` — 7 tests pass.
- `wizardMachine.spec.ts` — fails due to pre-existing `@auto-tm/contracts` workspace package resolution issue (not caused by this PR).
- All modified files pass lint with 0 errors.

## AC 11: CONTEXT.md files updated

**PASS**

- `apps/mobile/CONTEXT.md` — updated with design system section, auth screen descriptions, sell wizard description.
- `apps/mobile/src/listings/CONTEXT.md` — updated with design-matched component descriptions.

## AC 12–14: Lint / typecheck / test

- **Lint**: `pnpm -F @auto-tm/mobile lint` passes with 0 errors on all modified files.
- **Typecheck**: Pre-existing `@auto-tm/contracts` workspace resolution errors exist on base branch; no new type errors introduced by this PR.
- **Test**: `vehicleFieldErrorVisibility` and `useWizardAutosave` tests pass. `wizardMachine.spec.ts` fails due to pre-existing workspace package issue.
