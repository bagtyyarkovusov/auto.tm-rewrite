# AC Evidence — Issue #124

## Acceptance Criteria Verification

### 1. Design tokens applied
- **White bg** `#ffffff` → `bg-background` (semantic token maps to white in light mode)
- **Primary text** `#000000` → `text-foreground` (semantic token)
- **Secondary** `#4b4b4b` → `text-muted-foreground`
- **Muted** `#afafaf` → `text-muted-foreground` / placeholder colors
- **Border** `#e2e2e2` → `border-border`
- **Error** `#F43F5E` → `text-destructive` / `border-destructive`
- **Success** `#16a34a` → added to `tailwind.config.js` as `success: { 500: "#16a34a" }`
- Fonts loaded in `app/_layout.tsx` with `useFonts`; woff2 mono fonts restricted to iOS (Android falls back to system mono)

### 2. Buttons are pill-shaped, 52px height
- `WizardFooter.tsx`: both Back and Continue/Publish buttons use `h-[52px] rounded-full`
- `Step2Photos.tsx`: Camera and Library buttons use `h-[52px] rounded-full`
- `SignInDialog.tsx`: Continue button uses `size="lg"`
- `sell.tsx`: Start/Continue/New listing buttons use `h-[52px] rounded-full`

### 3. Inputs are 52px with 8px radius
- `Input.tsx` (RNR component): `h-[52px] rounded-lg border px-3.5`
- `PickerRow.tsx`: `h-[52px] rounded-md`

### 4. Typography uses custom UberMove fonts
- `app/_layout.tsx`: `useFonts` loads all 8 font files (otf always, woff2 iOS-only)
- `tailwind.config.js`: `fontFamily` extends with `sans`, `heading`, `mono`
- `OtpCells.tsx`: uses `font-uber-mono` class
- Step titles use `text-2xl font-semibold`

### 5. Auth screens match design archive
- `app/(auth)/phone.tsx`: matches `01-phone.html` layout, spacing, loading states, legal footer
- `app/(auth)/otp.tsx`: matches `02-otp.html` with specific error copy, resend countdown, dev code pill
- `components/auth/PhoneInput.tsx`: locked +993 prefix, maxLength propagation
- `components/auth/OtpCells.tsx`: 6-digit cells with shake animation, mono font

### 6. Tab bar matches design
- `components/navigation/AutoTmTabBar.tsx`: custom tab bar replacing default Expo tab bar
- 5 routes with active/inactive states
- Central Sell action with black pill treatment
- Matches `app-shell.html` tab bar styling

### 7. Wizard chrome and steps match design
- `WizardLayout.tsx`: header with back/overflow, progress bar, save status, footer with pill buttons
- All 8 step components updated with consistent `gap-5 py-5` body, `text-2xl font-semibold` titles
- `PickerRow` updated to 52px height
- Edit route (`app/listings/[id]/edit.tsx`) uses same WizardLayout chrome

### 8. Overflow menu opens before discard confirmation
- `WizardOverflowMenu.tsx`: sheet with "Discard draft" action
- Overflow button in header opens sheet first
- Tapping "Discard draft" opens `DiscardConfirmationDialog`

### 9. Discard confirmation has loading/error handling
- `DiscardConfirmationDialog` shows `ActivityIndicator` + "Discarding…" when `isDiscarding` is true
- Shows error text when `discardError` is provided
- Cancel button disabled during discard
- `sell.tsx` passes `discardDraft.isPending` and `discardDraft.error?.message`

### 10. Sell entry matches design
- `app/(tabs)/sell.tsx`: top-aligned "Sell" title (32px bold)
- Draft card with photo count, price info, continue button
- Empty state centered with start button

## Verification Commands

```bash
pnpm -F @auto-tm/mobile typecheck   # ✅ pass
pnpm -F @auto-tm/mobile lint        # ✅ pass (0 errors)
pnpm -F @auto-tm/mobile test        # ✅ 102 tests pass
```

## Files Changed

- `apps/mobile/app/_layout.tsx` — font loading (woff2 iOS-only)
- `apps/mobile/app/(tabs)/_layout.tsx` — custom tab bar
- `apps/mobile/app/(tabs)/sell.tsx` — sell entry redesign
- `apps/mobile/app/(auth)/phone.tsx` — auth screen
- `apps/mobile/app/(auth)/otp.tsx` — auth screen
- `apps/mobile/app/listings/[id]/edit.tsx` — edit mode (new props)
- `apps/mobile/components/navigation/AutoTmTabBar.tsx` — new
- `apps/mobile/components/listings/wizard/WizardOverflowMenu.tsx` — new
- `apps/mobile/components/auth/PhoneInput.tsx` — updated
- `apps/mobile/components/auth/OtpCells.tsx` — updated
- `apps/mobile/components/listings/wizard/PickerRow.tsx` — updated
- `apps/mobile/src/listings/wizard/WizardLayout.tsx` — updated (overflow menu, discard loading/error)
- `apps/mobile/src/listings/wizard/Step1Vin.tsx` — updated
- `apps/mobile/src/listings/wizard/Step2Photos.tsx` — updated
- `apps/mobile/src/listings/wizard/Step3VehicleId.tsx` — updated
- `apps/mobile/src/listings/wizard/Step4Specs.tsx` — updated
- `apps/mobile/src/listings/wizard/Step5Price.tsx` — updated
- `apps/mobile/src/listings/wizard/Step6Location.tsx` — updated
- `apps/mobile/src/listings/wizard/Step7DescContact.tsx` — updated
- `apps/mobile/src/listings/wizard/Step8Review.tsx` — updated
- `apps/mobile/tailwind.config.js` — fontFamily + success color
- `apps/mobile/CONTEXT.md` — updated
- `apps/mobile/src/listings/CONTEXT.md` — updated
