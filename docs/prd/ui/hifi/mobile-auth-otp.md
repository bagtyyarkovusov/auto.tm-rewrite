# Hi-Fi — Mobile OTP Auth Screen

> Issue: #124 — apply wizard design handoff to app shell, auth, and listing wizard  
> Maps to: `apps/mobile/app/(auth)/otp.tsx`  
> Derived from wireframe: `docs/prd/ui/wireframes/mobile-auth-otp.md`  
> Design archive source: `screens/02-otp.html`

==============================================
HIGH-FIDELITY DESIGN — Mobile OTP Auth Screen
Platform: mobile
Mode: light + dark
==============================================

## Purpose

Verify the six-digit SMS code, support paste/autofill, and return to the deferred action or tab app. Specific error recovery copy per UX audit finding #4.

## Layout

```text
┌────────────────────────────────────────────┐
│ safe-top                                   │
│ [<] [X]                            RU TK EN│
│                                            │
│        auto.tm red SVG logo                │
│                                            │
│ Enter the code                             │
│ Code sent to +993 6X XX-XX-42              │
│ [Change number]                            │
│                                            │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐             │
│ │1 │ │2 │ │3 │ │4 │ │5 │ │6 │             │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘             │
│                                            │
│ ◐ Wrong code. Try again.                   │
│                                            │
│ Resend code in 42s                         │
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ Dev code: 123456                       │ │
│ └────────────────────────────────────────┘ │
│                                            │
└────────────────────────────────────────────┘
```

## Token map

### Backgrounds + surfaces
- Root: `bg-background`
- OTP cell default: `bg-background border-[1.5px] border-border`
- OTP cell filled: `border-foreground`
- OTP cell focused: `border-foreground border-2 shadow-sm`
- OTP cell error: `border-destructive border-2 shadow-[0_0_0_3px_rgba(244,63,94,0.08)]`
- Error row: transparent
- Resend button: transparent
- Dev pill: `bg-background border-[1.5px] border-foreground rounded-full`
- Loader row: transparent

### Borders + dividers
- OTP cells: `border-[1.5px] border-border rounded-lg`
- Dev pill: `border-[1.5px] border-foreground rounded-full`

### Typography
- Title: `font-display`, `text-[28px] leading-tight font-bold tracking-tight text-foreground`
- Destination: `text-base text-neutral-500`
- Change number: `text-sm font-medium text-foreground underline`
- OTP cell digit: `font-mono`, `text-2xl font-medium text-foreground`
- OTP cell error digit: `text-destructive`
- Error text: `text-sm font-medium text-destructive`
- Resend disabled: `text-sm text-neutral-400`
- Resend enabled: `text-sm font-medium text-foreground underline`
- Verifying: `text-sm text-neutral-500`
- Dev pill: `font-mono`, `text-[13px] font-medium text-foreground`

### Spacing
- Top bar: `px-5 pt-safe pb-4 flex-row justify-between`
- Logo: `mt-6 mx-5` (width 130px)
- Title group: `mt-8 mx-5 gap-2`
- OTP area: `mx-5 mt-8 gap-4`
- OTP row: `flex-row gap-2`
- Cell: `flex-1 aspect-square` (square cells)
- Error row: `mt-0` (inside OTP area gap)
- Resend row: `mt-0`
- Loader row: `mt-0`
- Dev pill: `mx-5 mt-4 self-start`

### Radius
- OTP cells: `rounded-lg` (8px)
- Dev pill: `rounded-full`
- Icon buttons: `rounded-full`

### Icons
- Back: `ChevronLeft`, 22×22, `text-foreground`
- Close: `X`, 22×22, `text-foreground`
- Error: `AlertCircle`, 16×16, `text-destructive`

## Component shape

### Implementation (mobile — NativeWind v4 + RNR)

```tsx
import { useRef, useState } from "react";
import { Pressable, View, TextInput as RNTextInput } from "react-native";
import { AlertCircle, ChevronLeft, X } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

const ERROR_COPY: Record<string, { ru: string; tk: string; en: string }> = {
  wrong: { ru: "Неверный код. Попробуйте снова", tk: "Nädogry kod. Gaýtadan synanyşyň", en: "Wrong code. Try again." },
  expired: { ru: "Код устарел. Запросите новый.", tk: "Kod möhleti gutardy. Täze kod alyň.", en: "Code expired. Request a new one." },
  locked: { ru: "Слишком много попыток. Запросите новый код.", tk: "Gaty köp synanyşyk. Täze kod alyň.", en: "Too many attempts. Request a new code." },
  used: { ru: "Этот код уже использован. Запросите новый.", tk: "Bu kod eýýäm ulanyldy. Täze kod alyň.", en: "This code has already been used. Request a new one." },
  rateLimited: { ru: "Слишком много попыток. Попробуйте через несколько минут.", tk: "Gaty köp synanyşyk. Birnäçe minutdan gaýtadan synanyşyň.", en: "Too many attempts. Try again in a few minutes." },
  generic: { ru: "Не удалось войти. Попробуйте снова.", tk: "Ulgama girmek bolmady. Gaýtadan synanyşyň.", en: "Could not sign in. Try again." },
};

export default function OtpScreen() {
  const [value, setValue] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorType, setErrorType] = useState("wrong");
  const [seconds, setSeconds] = useState(42);
  const inputRef = useRef<RNTextInput>(null);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Top bar */}
      <View className="px-5 pt-safe pb-4 flex-row items-center justify-between">
        <View className="flex-row gap-1">
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full">
            <Icon as={ChevronLeft} className="size-[22px] text-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full">
            <Icon as={X} className="size-[22px] text-foreground" />
          </Button>
        </View>
        <View className="flex-row gap-1">
          {["RU", "TK", "EN"].map((l) => (
            <Button key={l} variant="ghost" size="sm" className="rounded-full px-2.5 py-1.5">
              <Text className="text-[13px] font-medium text-neutral-400">{l}</Text>
            </Button>
          ))}
        </View>
      </View>

      {/* Brand logo */}
      <View className="mx-5 mt-6">
        {/* <BrandLogo width={130} /> */}
      </View>

      {/* Title */}
      <View className="mx-5 mt-8 gap-2">
        <Text className="font-display text-[28px] leading-tight font-bold tracking-tight text-foreground">
          Enter the code
        </Text>
        <Text className="text-base text-neutral-500">
          Code sent to +993 6X XX-XX-XX
        </Text>
        <Button variant="link" className="self-start px-0 py-0 h-auto">
          <Text className="text-sm font-medium text-foreground underline">
            Change number
          </Text>
        </Button>
      </View>

      {/* OTP area */}
      <View className="mx-5 mt-8 gap-4">
        {/* Hidden input */}
        <RNTextInput
          ref={inputRef}
          className="absolute opacity-0 w-px h-px"
          keyboardType="number-pad"
          maxLength={6}
          value={value}
          onChangeText={(text) => {
            if (isLoading) return;
            const digits = text.replace(/\D/g, "").slice(0, 6);
            setValue(digits);
            setIsError(false);
            if (digits.length === 6) {
              setIsLoading(true);
              // trigger verify
            }
          }}
          editable={!isLoading}
        />

        {/* Cells */}
        <Pressable className="flex-row gap-2" onPress={() => inputRef.current?.focus()}>
          {Array.from({ length: 6 }).map((_, i) => {
            const digit = value[i];
            const focused = i === value.length && !isError && !isLoading;
            const hasError = isError && !!digit;
            return (
              <View
                key={i}
                className={`flex-1 aspect-square items-center justify-center rounded-lg bg-background ${
                  hasError
                    ? "border-[2px] border-destructive shadow-[0_0_0_3px_rgba(244,63,94,0.08)]"
                    : focused
                    ? "border-[2px] border-foreground shadow-sm"
                    : digit
                    ? "border-[1.5px] border-foreground"
                    : "border-[1.5px] border-border"
                }`}
              >
                <Text
                  className={`font-mono text-2xl font-medium ${
                    hasError ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {digit || ""}
                </Text>
              </View>
            );
          })}
        </Pressable>

        {/* Error row */}
        {isError && (
          <View className="flex-row items-center gap-1.5">
            <Icon as={AlertCircle} className="size-4 text-destructive" />
            <Text className="text-sm font-medium text-destructive">
              {ERROR_COPY[errorType]?.en || ERROR_COPY.wrong.en}
            </Text>
          </View>
        )}

        {/* Resend row */}
        <View className="flex-row items-center gap-1.5">
          <Button variant="link" className="px-0 py-0 h-auto" disabled={seconds > 0}>
            <Text className={`text-sm ${seconds > 0 ? "text-neutral-400 no-underline" : "font-medium text-foreground underline"}`}>
              {seconds > 0 ? `Resend code in ${seconds}s` : "Resend code"}
            </Text>
          </Button>
        </View>

        {/* Loader row */}
        {isLoading && (
          <View className="flex-row items-center gap-2.5">
            {/* Spinner */}
            <Text className="text-sm text-neutral-500">Verifying…</Text>
          </View>
        )}
      </View>

      {/* Dev pill */}
      {__DEV__ && (
        <View className="mx-5 mt-4 self-start px-3.5 py-1.5 bg-background border-[1.5px] border-foreground rounded-full">
          <Text className="font-mono text-[13px] font-medium text-foreground">
            Dev code: 123456
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
```

## Customization plan

| Primitive | Path | File | Details |
|---|---|---|---|
| `View` (OTP cell) | Custom composition | `apps/mobile/app/(auth)/otp.tsx` | 6 square `View`s over a hidden `TextInput`. States: default/filled/focused/error/loading. |
| `Button` (link) | Default | `apps/mobile/components/ui/button.tsx` | `variant="link"` for "Change number" and "Resend code". |
| Shake animation | Inline style | `apps/mobile/app/(auth)/otp.tsx` | Error cells shake via Reanimated or RN `Animated` transform. Map to `duration.fast` (150ms) with standard easing. |

## States

### Default
First cell focused (border-foreground 2px + shadow). Destination copy visible. Resend disabled with countdown.

### Loading
Hidden input disabled. Cells non-interactive. "Verifying…" loader row visible.

### Empty
First cell focused; no digits entered.

### Error (wrong)
Shake cells, clear all, refocus first cell. Copy: "Wrong code. Try again."

### Error (expired)
Copy: "Code expired. Request a new one."

### Error (locked)
Copy: "Too many attempts. Request a new code."

### Error (used)
Copy: "This code has already been used. Request a new one."

### Error (rate-limited)
Copy: "Too many attempts. Try again in a few minutes."

### Error (generic)
Copy: "Could not sign in. Try again."

### Offline
Inline warning banner; keep entered code in memory while screen mounted.

## Motion

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Cell focus | border-color + shadow | `fast` (150ms) | `standard` |
| Cell error | shake translateX ±6px, ±4px | `fast` (150ms) × 2 | `standard` |
| Dev pill press | opacity 0.7 | `fast` (150ms) | `standard` |
| Resend enable | underline + color transition | `fast` (150ms) | `standard` |
| Loader spinner | rotate 360deg loop | 800ms | `linear` |

Reduced motion: disable shake and spinner; keep instant state changes.

## Accessibility

- **Contrast ratios**: `text-foreground` on `bg-background` ≥ 21:1. `text-destructive` on `bg-background` ~ 6.8:1 (pass AA). `text-neutral-500` on `bg-background` ~ 5.4:1 (pass).
- **Tap targets**: Back/Close 40×40 (pass with padding). Cells fill full width of row; each cell tap target ~56×56 on standard width (pass).
- **Focus-visible**: Hidden input governs focus; cells reflect focus state visually.
- **Screen reader**: Hidden input has `accessibilityLabel="One-time code, 6 digits"`. Error row announces on appearance. Resend button announces disabled state.
- **Reading order**: Back → Close → Language chips → Logo → Title → Destination → Change number → OTP cells → Error → Resend → Loader → Dev pill.

## Trilingual copy

| Key | RU | TK | EN |
|---|---|---|---|
| `screen.title` | Введите код | Kody giriziň | Enter the code |
| `destination` | Код отправлен на +993 6X XX-XX-XX | Kody +993 6X XX-XX-XX belgä iberildi | Code sent to +993 6X XX-XX-XX |
| `changeNumber` | Изменить номер | Belgini üýtgetmek | Change number |
| `resend.disabled` | Отправить код повторно через {n}с | Kody {n} sekuntdan gaýtadan iber | Resend code in {n}s |
| `resend.enabled` | Отправить код повторно | Kody gaýtadan iber | Resend code |
| `error.wrong` | Неверный код. Попробуйте снова. | Nädogry kod. Gaýtadan synanyşyň. | Wrong code. Try again. |
| `error.expired` | Код устарел. Запросите новый. | Kod möhleti gutardy. Täze kod alyň. | Code expired. Request a new one. |
| `error.locked` | Слишком много попыток. Запросите новый код. | Gaty köp synanyşyk. Täze kod alyň. | Too many attempts. Request a new code. |
| `error.used` | Этот код уже использован. Запросите новый. | Bu kod eýýäm ulanyldy. Täze kod alyň. | This code has already been used. Request a new one. |
| `error.rateLimited` | Слишком много попыток. Попробуйте через несколько минут. | Gaty köp synanyşyk. Birnäçe minutdan gaýtadan synanyşyň. | Too many attempts. Try again in a few minutes. |
| `error.generic` | Не удалось войти. Попробуйте снова. | Ulgama girmek bolmady. Gaýtadan synanyşyň. | Could not sign in. Try again. |
| `loader` | Проверка… | Barlanylýar… | Verifying… |
| `devPill` | Dev код: 123456 | Dev kody: 123456 | Dev code: 123456 |

## Implementation notes

- OTP cells use a hidden `TextInput` behind 6 `View`s for paste/autofill support.
- Auto-submit on 6th digit. Prevent duplicate verify requests with `isLoading` guard.
- Shake animation: use Reanimated `useSharedValue` + `useAnimatedStyle` for 60fps. Fallback to RN `Animated` if Reanimated is unavailable.
- Cells must not show `cursor:text` when disabled (UX audit finding #8).
- Resend countdown starts at 42s; resets to 42s on each resend tap.

## Design archive mapping

- `screens/02-otp.html` → `app/(auth)/otp.tsx`.
