# Design Visual Evidence — Issue #124

## Design Source
`docs/prd/ui/design guidelines/design guidiline for the the wizard/` — HTML screens + assets

## Screens Implemented

### Auth Flow
| Screen | File | Design Reference | Status |
|--------|------|-----------------|--------|
| Phone entry | `app/(auth)/phone.tsx` | `01-phone.html` | ✅ Refactored |
| OTP verification | `app/(auth)/otp.tsx` | `02-otp.html` | ✅ Refactored |

### App Shell
| Component | File | Design Reference | Status |
|-----------|------|-----------------|--------|
| Tab bar | `components/navigation/AutoTmTabBar.tsx` | `app-shell.html` | ✅ New custom |

### Wizard Steps
| Step | File | Status |
|------|------|--------|
| Sell entry | `app/(tabs)/sell.tsx` | ✅ Refactored |
| Step 1: VIN | `src/listings/wizard/Step1Vin.tsx` | ✅ Refactored |
| Step 2: Photos | `src/listings/wizard/Step2Photos.tsx` | ✅ Refactored |
| Step 3: Vehicle | `src/listings/wizard/Step3VehicleId.tsx` | ✅ Refactored |
| Step 4: Specs | `src/listings/wizard/Step4Specs.tsx` | ✅ Refactored |
| Step 5: Price | `src/listings/wizard/Step5Price.tsx` | ✅ Refactored |
| Step 6: Location | `src/listings/wizard/Step6Location.tsx` | ✅ Refactored |
| Step 7: Contact | `src/listings/wizard/Step7DescContact.tsx` | ✅ Refactored |
| Step 8: Review | `src/listings/wizard/Step8Review.tsx` | ✅ Refactored |
| Layout | `src/listings/wizard/WizardLayout.tsx` | ✅ Refactored |
| Overflow menu | `components/listings/wizard/WizardOverflowMenu.tsx` | ✅ New |
| Discard dialog | `src/listings/wizard/WizardLayout.tsx` | ✅ Updated with loading/error |

## Design Token Mapping

| Design Token | Tailwind / RN Value | Usage |
|-------------|---------------------|-------|
| White bg | `bg-background` | Screen backgrounds |
| Primary text #000000 | `text-foreground` | Labels, titles, input text |
| Secondary #4b4b4b | `text-muted-foreground` | Helpers, placeholders |
| Border #e2e2e2 | `border-border` | Inputs, pickers, cards |
| Error #F43F5E | `text-destructive` | Error messages |
| Success #16a34a | `text-success-500` | Save status indicator |
| Button height 52px | `h-[52px]` | All CTA buttons |
| Button radius pill | `rounded-full` | Primary/secondary CTAs |
| Input height 52px | `h-[52px]` | Text inputs, picker rows |
| Input radius 8px | `rounded-lg` / `rounded-md` | Inputs, pickers |
| Step title 24px bold | `text-2xl font-semibold` | Step headings |
| Body gap 20px | `gap-5` | Step content containers |
| Field gap 6px | `gap-1.5` | Label-input-error groups |

## Font Mapping

| Font Family | Weight | File | Tailwind Token | Platform |
|------------|--------|------|---------------|----------|
| UberMove | Medium | `UberMoveMedium.otf` | `font-heading` | All |
| UberMove | Bold | `UberMoveBold.otf` | `font-heading` | All |
| UberMoveText | Regular | `UberMoveTextRegular.otf` | `font-sans` | All |
| UberMoveText | Medium | `UberMoveTextMedium.otf` | `font-sans` | All |
| UberMoveText | Bold | `UberMoveTextBold.otf` | `font-sans` | All |
| UberMoveText | Light | `UberMoveTextLight.otf` | `font-sans` | All |
| UberMoveMono | Regular | `UberMoveMono-Regular.woff2` | `font-mono` | iOS only |
| UberMoveMono | Medium | `UberMoveMono-Medium.woff2` | `font-mono` | iOS only |

## Native Constraints

- **woff2 fonts**: Expo Font does not support woff2 on Android. UberMoveMono woff2 files are loaded only on iOS; Android falls back to system monospace (`Menlo`, `monospace`). Documented in `ac-evidence.md`.
- **Tab bar backdrop blur**: React Native does not support `backdrop-filter` CSS. The tab bar uses `bg-background/90` (90% opacity) as the closest equivalent.
- **Sell entry draft thumbnail**: The design shows a gradient thumbnail with a car icon. Real draft data from `useMyDrafts` does not include pre-rendered thumbnails, so the draft card shows text metadata (photo count, price) instead.
