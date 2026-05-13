# 78-02 — Input

## Purpose

Single-line or multi-line text input. Covers most form field needs.

## When to use

- Text fields in forms
- Search bars
- Phone number entry (with format mask)
- OTP code entry (specialized: use the OTP variant)

## When NOT to use

- Picking one of N options — use Select / Tabs / Radio
- Number with min/max — use Input with `type="number"` AND clamping; or a Slider
- Date — use the platform date picker
- File upload — use FileUpload component

## Variants

### Kind

- `text` — single-line plain text
- `phone` — with country prefix masking (+993 locked)
- `email` — with `type="email"`
- `password` — with show/hide toggle
- `search` — with leading search icon + clear button on right
- `textarea` — multi-line; rows configurable
- `otp` — N pin-style inputs in a row (specialized for OTP entry)

### Size

| Size | Height (single-line) | Padding |
|---|---|---|
| `sm` | 36 | 10 horizontal |
| `md` (default) | 48 | 12 horizontal |
| `lg` | 56 | 16 horizontal |

## Anatomy

```
┌────────────────────────────────────┐
│ Label (above the input)            │
│ ┌────────────────────────────────┐ │
│ │ <icon?>  Input area     <action>│ │
│ └────────────────────────────────┘ │
│ Helper text / error message        │
└────────────────────────────────────┘
```

Parts:
- **Label** (`sm`, medium weight) — visible above the input; never use placeholder as a label
- **Leading icon** (optional) — e.g., search icon
- **Input area** — the typing surface
- **Trailing action** (optional) — clear button, show/hide password, etc.
- **Helper text** (`sm`, regular weight) — under the input; turns red on error

## States

| State | Visual |
|---|---|
| Default | Border `neutral-200` (light) / `neutral-700` (dark) |
| Hover (web) | Border `neutral-300` |
| Focused | Border `primary` (brand red) 2px, slight inner glow |
| Filled | No special style |
| Disabled | Bg `neutral-50`; text `neutral-400`; no interaction |
| Error | Border `error` (rose); helper text in `error` color |
| Read-only | Looks like default but no cursor on focus |

## Validation

- Validate on blur (not on every keystroke — too noisy)
- Show error inline below the input
- Multiple errors: list them; first is most prominent

## Accessibility

- `<label for="id">` (web) — explicit label association
- `accessibilityLabel` (RN) if no visible label (rare)
- `aria-invalid="true"` + `aria-describedby` linking to helper text when error
- `aria-required="true"` when required

## Implementation (web)

```tsx
<Input
  label="Phone number"
  kind="phone"
  prefix="+993"
  size="md"
  required
  error={errors.phone}
  helperText="Enter your mobile number"
  {...form.register('phone')}
/>
```

## Implementation (mobile)

```tsx
<Input
  label="Phone number"
  kind="phone"
  prefix="+993"
  size="md"
  value={phone}
  onChangeText={setPhone}
  error={errors.phone}
/>
```

## OTP variant (special case)

```tsx
<OtpInput
  length={6}
  value={code}
  onChange={setCode}
  onComplete={handleVerify}   // auto-fires when all digits filled
  autoFocus
/>
```

Specs:
- 6 separate input cells, each 56×64
- Auto-advance to next cell on type
- Backspace goes to previous cell
- Paste support: pastes 6-digit code across cells
- iOS: `textContentType="oneTimeCode"` for SMS auto-fill
- Android: `autoComplete="sms-otp"`

## Don'ts

- ❌ Placeholder as the only label
- ❌ Hidden labels without `aria-label`
- ❌ Error messages that say only "Invalid input" — be specific
- ❌ Auto-submit on enter when there's only one input (confusing on mobile)
- ❌ Number inputs with `type="number"` for phone numbers — use `type="tel"`
