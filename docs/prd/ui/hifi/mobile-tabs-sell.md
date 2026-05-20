# Hi-Fi — Mobile Sell Tab

> Issue: #124 — apply wizard design handoff to app shell, auth, and listing wizard  
> Maps to: `apps/mobile/app/(tabs)/sell.tsx`  
> Derived from wireframe: `docs/prd/ui/wireframes/mobile-tabs-sell.md`  
> Design archive source: `screens/00-sell-entry.html`

==============================================
HIGH-FIDELITY DESIGN — Mobile Sell Tab
Platform: mobile
Mode: light + dark
==============================================

## Purpose

Entry point to the listing wizard. Shows the latest draft (if any) with progress, or a direct "New listing" CTA. This is the highest-intent screen in the app.

## Layout

```text
┌────────────────────────────────────────────┐
│ safe-top                                   │
│ Sell                                       │
├────────────────────────────────────────────┤
│                                            │
│ ┌────────────────────────────────────────┐ │
│ │ ┌──────────────────────────────────┐   │ │
│ │ │         [car placeholder]        │   │ │
│ │ │                    8 photos       │   │ │
│ │ └──────────────────────────────────┘   │ │
│ │ LATEST DRAFT                           │ │
│ │ 2018 Toyota Camry                      │ │
│ │ Saved 2 min ago  ·  Price missing      │ │
│ │ 6 of 8  [==========------]             │ │
│ │ [Continue draft]            (black)    │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ [New listing]                   (outline)  │
│                                            │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ My listings                    0 active  > │
│ My garage                                > │
│                                            │
└────────────────────────────────────────────┘
```

## Token map

### Backgrounds + surfaces
- Root: `bg-background`
- Draft card: `bg-card` (or `bg-background` with `border border-border`)
- Thumbnail placeholder: gradient from `neutral-700` → `neutral-900` (requires `expo-linear-gradient`)
- Photo count badge: `bg-black/65` with `text-white`
- Progress track: `bg-neutral-200`
- Progress fill: `bg-black dark:bg-white`

### Borders + dividers
- Draft card: `border border-border rounded-xl` (12px)
- Thumbnail: `rounded-lg` (8px)
- Section divider: `border-t border-border`

### Typography
- Screen title "Sell": `font-display`, `text-[32px] leading-tight font-bold tracking-tight text-foreground`
- Card label "Latest draft": `text-xs font-medium uppercase tracking-wide text-neutral-400`
- Card title: `font-display`, `text-xl font-bold text-foreground`
- Card meta: `text-sm text-neutral-500`
- Progress text: `text-sm text-neutral-500`
- Button text: `text-base font-medium`
- Helper row label: `text-base font-medium text-foreground`
- Helper row action: `text-sm text-neutral-400`

### Spacing
- Title: `px-5 pt-safe pb-4`
- Card: `mx-5 p-4 gap-2.5`
- Thumbnail: `h-[140px]`
- Button group: `px-5 gap-3 mt-2`
- Section divider: `mx-5 my-4`
- Helper rows: `mx-5`

### Radius
- Card: `rounded-xl` (12px)
- Thumbnail: `rounded-lg` (8px)
- Buttons: `rounded-full`
- Photo count badge: `rounded-full`

### Shadows
- Draft card: `shadow-sm` (subtle lift)

### Icons
- Car placeholder: `Car` Lucide, 48×48, `text-white/25`
- Chevron (helper rows): `ChevronRight`, 16×16, `text-neutral-400`

## Component shape

### Implementation (mobile — NativeWind v4 + RNR)

```tsx
import { View } from "react-native";
import { Car, ChevronRight } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";

export default function SellScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-safe pb-4">
        <Text className="font-display text-[32px] leading-tight font-bold tracking-tight text-foreground">
          Sell
        </Text>
      </View>

      {/* Draft card */}
      <Card className="mx-5 p-4 gap-2.5 shadow-sm">
        {/* Thumbnail */}
        <View className="h-[140px] rounded-lg bg-gradient-to-br from-neutral-700 to-neutral-900 items-center justify-center overflow-hidden">
          <Icon as={Car} className="size-12 text-white/25" />
          <View className="absolute bottom-2 left-2 px-2 py-1 bg-black/65 rounded-full">
            <Text className="text-[11px] font-medium text-white">8 photos</Text>
          </View>
        </View>

        <Text className="text-xs font-medium uppercase tracking-wide text-neutral-400">
          Latest draft
        </Text>
        <Text className="font-display text-xl font-bold text-foreground">
          2018 Toyota Camry
        </Text>
        <Text className="text-sm text-neutral-500">
          Saved 2 min ago · Price missing
        </Text>

        {/* Progress */}
        <View className="flex-row items-center gap-2">
          <Text className="text-sm text-neutral-500">6 of 8</Text>
          <View className="flex-1 h-1 bg-neutral-200 rounded-full overflow-hidden">
            <View className="h-full bg-black dark:bg-white rounded-full" style={{ width: "75%" }} />
          </View>
        </View>

        <Button variant="default" className="h-[52px] rounded-full bg-black dark:bg-white">
          <Text className="text-base font-medium text-white dark:text-black">
            Continue draft
          </Text>
        </Button>
      </Card>

      {/* New listing */}
      <View className="px-5 mt-3">
        <Button
          variant="outline"
          className="h-[52px] rounded-full border-[1.5px] border-foreground"
        >
          <Text className="text-base font-medium text-foreground">New listing</Text>
        </Button>
      </View>

      <Separator className="mx-5 my-4" />

      {/* Helper rows */}
      <View className="mx-5 gap-0">
        <View className="flex-row items-center justify-between py-3.5 border-t border-border">
          <Text className="text-base font-medium text-foreground">My listings</Text>
          <View className="flex-row items-center gap-1">
            <Text className="text-sm text-neutral-400">0 active</Text>
            <Icon as={ChevronRight} className="size-4 text-neutral-400" />
          </View>
        </View>
        <View className="flex-row items-center justify-between py-3.5 border-t border-border">
          <Text className="text-base font-medium text-foreground">My garage</Text>
          <Icon as={ChevronRight} className="size-4 text-neutral-400" />
        </View>
      </View>
    </SafeAreaView>
  );
}
```

## Customization plan

| Primitive | Path | File | Details |
|---|---|---|---|
| `Button` (default) | Variant override at call site | `apps/mobile/app/(tabs)/sell.tsx` | `bg-black dark:bg-white` + `text-white dark:text-black` overrides the default brand-red primary. This is a design-archive divergence documented in `apps/mobile/CONTEXT.md`. |
| `Button` (outline) | Variant override at call site | `apps/mobile/app/(tabs)/sell.tsx` | `border-[1.5px] border-foreground` to match design archive outline weight. |
| `Progress` | Custom composition | `apps/mobile/app/(tabs)/sell.tsx` | Design archive uses 4px height, black fill, gray track. RNR `Progress` may not support these defaults; compose a custom `View`-based progress bar. |
| `Card` | Default | `apps/mobile/components/ui/card.tsx` | Default `bg-card` and `border-border` suffice. |

## States

### Default
Draft card + "New listing" button + helper rows.

### Loading
Skeleton card (180px height, shimmer) while `useMyDrafts` is pending:
```tsx
<View className="mx-5">
  <Skeleton className="h-[180px] rounded-xl" />
</View>
```
Hide buttons and helper rows until draft state resolves.

### Empty (no drafts)
Hide draft card. Show only "New listing" button and helper rows.

### Error
Inline error row below title:
```tsx
<View className="mx-5 mt-2 p-3 rounded-lg bg-destructive/10 flex-row items-center gap-2">
  <Icon as={AlertCircle} className="size-4 text-destructive" />
  <Text className="text-sm font-medium text-destructive">
    Could not load draft. Try again.
  </Text>
</View>
```

### Offline
Show last known draft if cached; else empty state with offline helper.

### Unauthenticated
Show `SignInDialog` sheet instead of opening wizard when "Continue draft" or "New listing" is tapped.

## Motion

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Draft card mount | fade in + slide up 8px | `base` (250ms) | `decel` |
| Button press | scale 0.98 | `fast` (150ms) | `standard` |
| Helper row press | opacity 0.7 | `fast` (150ms) | `standard` |
| Progress fill | width transition | `base` (250ms) | `standard` |
| Skeleton shimmer | translateX loop | `base` (250ms) × 2 | `linear` |

Reduced motion: instant opacity/scale changes; disable skeleton shimmer.

## Accessibility

- **Contrast ratios**: `text-foreground` on `bg-background` ≥ 21:1. `text-neutral-500` on `bg-background` ~ 5.4:1 (pass AA body). Black button `bg-black` on `text-white` ≥ 21:1.
- **Tap targets**: Buttons 52px height (pass). Helper rows 44px minimum (pass with `py-3.5`).
- **Focus-visible**: Buttons show default RNR focus ring.
- **Screen reader**: Photo count badge reads "8 photos". Draft title reads as heading. Progress bar needs `accessibilityRole="progressbar"` + `accessibilityValue`.
- **Reading order**: Title → Thumbnail → Label → Title → Meta → Progress → Continue CTA → New listing CTA → My listings → My garage.

## Trilingual copy

| Key | RU | TK | EN |
|---|---|---|---|
| `screen.title` | Продать | Satmak | Sell |
| `card.label` | ЧЕРНОВИК | TASLAMA | Latest draft |
| `cta.continue` | Продолжить черновик | Taslamany dowam et | Continue draft |
| `cta.new` | Новое объявление | Täze bildiriş | New listing |
| `row.myListings` | Мои объявления | Meniň bildirişlerim | My listings |
| `row.myGarage` | Мой гараж | Meniň garažym | My garage |
| `error.load` | Не удалось загрузить черновик. Попробуйте снова. | Taslamany ýükläp bolmady. Gaýtadan synanyşyň. | Could not load draft. Try again. |

## Implementation notes

- The draft thumbnail gradient requires `expo-linear-gradient` (already installed). If not available, use a solid `bg-neutral-800` fallback.
- Progress bar is composed manually because the design archive specifies 4px height and black fill, which may not match RNR `Progress` defaults.
- "My listings" count badge and chevron are tappable as a single row.
- Helper rows use `border-t` except the first; the parent `View` starts with no top border.

## Design archive mapping

- `screens/00-sell-entry.html` → `app/(tabs)/sell.tsx` entry screen (non-wizard state).
