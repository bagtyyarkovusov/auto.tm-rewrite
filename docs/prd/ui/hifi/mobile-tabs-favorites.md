# Hi-Fi — Mobile Favorites Tab

> Issue: #124 — apply wizard design handoff to app shell, auth, and listing wizard  
> Maps to: `apps/mobile/app/(tabs)/favorites.tsx`  
> Derived from wireframe: `docs/prd/ui/wireframes/mobile-tabs-favorites.md`  
> Design archive source: `app-shell.html` (Favorites tab content)

==============================================
HIGH-FIDELITY DESIGN — Mobile Favorites Tab
Platform: mobile
Mode: light + dark
==============================================

## Purpose

Surface saved listings and saved searches. Currently a stub empty state with branded chrome.

## Layout

```text
┌────────────────────────────────────────────┐
│ safe-top                                   │
│ Favorites                                  │
├────────────────────────────────────────────┤
│                                            │
│         ◐ Heart (56px, neutral-400)        │
│                                            │
│      No favorites yet                      │
│  Tap the heart on any listing to save it   │
│  here for quick access.                    │
│                                            │
└────────────────────────────────────────────┘
```

## Token map

### Backgrounds + surfaces
- Root: `bg-background`
- Empty state: transparent

### Typography
- Screen title "Favorites": `font-display`, `text-[32px] leading-tight font-bold tracking-tight text-foreground`
- Empty heading: `font-display`, `text-xl font-bold text-foreground`
- Empty body: `text-base text-neutral-500`
- Anonymous CTA: `text-base font-medium text-foreground underline`

### Spacing
- Title horizontal: `px-5` (20px)
- Title vertical: `pt-safe pb-4`
- Empty state padding: `px-8 py-12`
- Icon-to-heading gap: `gap-4` (16px)
- Heading-to-body gap: `gap-2` (8px)

### Icons
- Empty state: `Heart`, 56×56, `text-neutral-400`

## Component shape

### Implementation (mobile — NativeWind v4 + RNR)

```tsx
import { View } from "react-native";
import { Heart } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export default function FavoritesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-safe pb-4">
        <Text className="font-display text-[32px] leading-tight font-bold tracking-tight text-foreground">
          Favorites
        </Text>
      </View>

      <View className="flex-1 items-center justify-center px-8 py-12 gap-4">
        <Icon as={Heart} className="size-14 text-neutral-400" />
        <Text className="font-display text-xl font-bold text-foreground">
          No favorites yet
        </Text>
        <Text className="text-base text-neutral-500 text-center max-w-[260px]">
          Tap the heart on any listing to save it here for quick access.
        </Text>
      </View>
    </SafeAreaView>
  );
}
```

## Customization plan

None — all RNR primitives used at defaults.

## States

### Default
Empty state shown above.

### Loading
Skeleton card list:
```tsx
<View className="px-5 gap-3">
  <Skeleton className="h-[140px] rounded-xl" />
  <Skeleton className="h-[140px] rounded-xl" />
</View>
```

### Empty
Empty state block shown above.

### Error
Inline retry row centered:
```tsx
<View className="mx-5 mt-2 p-3 rounded-lg bg-destructive/10 flex-row items-center gap-2">
  <Icon as={AlertCircle} className="size-4 text-destructive" />
  <Text className="text-sm font-medium text-destructive">
    Could not load favorites. Try again.
  </Text>
</View>
```

### Offline
Show last cached favorites if available; else empty state with offline helper appended:
```tsx
<Text className="text-sm text-neutral-400 text-center mt-2">
  You are offline.
</Text>
```

### Authenticated-only
If anonymous, replace empty state with:
```tsx
<View className="flex-1 items-center justify-center px-8 py-12 gap-4">
  <Icon as={Heart} className="size-14 text-neutral-400" />
  <Text className="font-display text-xl font-bold text-foreground">
    Sign in to save listings
  </Text>
  <Button variant="default" onPress={openAuth}>
    <Text>Sign in</Text>
  </Button>
</View>
```

## Motion

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Skeleton shimmer | translateX loop | `base` (250ms) × 2 | `linear` |

Reduced motion: disable skeleton shimmer.

## Accessibility

- **Contrast ratios**: `text-foreground` on `bg-background` ≥ 21:1 (pass). `text-neutral-500` on `bg-background` ~ 5.4:1 (pass AA body).
- **Tap targets**: Sign-in CTA 52×min-width (pass).
- **Focus-visible**: Sign-in button uses default RNR focus ring.
- **Screen reader**: Empty state icon is decorative; hide with `aria-hidden` (or `importantForAccessibility="no"` in RN).
- **Reading order**: Title → Icon → Heading → Body → CTA (if present).

## Trilingual copy

| Key | RU | TK | EN |
|---|---|---|---|
| `screen.title` | Избранное | Saýlananlar | Favorites |
| `empty.heading` | Пока нет избранного | Halanok | No favorites yet |
| `empty.body` | Нажмите сердечко на любом объявлении, чтобы сохранить его здесь для быстрого доступа. | Bildirişde ýürek şekiline basyp, ony çalt girmek üçin şu ýere ýazdyryp bilersiňiz. | Tap the heart on any listing to save it here for quick access. |
| `anon.cta` | Войдите, чтобы сохранять объявления | Bildirişleri ýazdyrmak üçin ulgama giriň | Sign in to save listings |
| `error.load` | Не удалось загрузить избранное. Попробуйте снова. | Saýlananlary ýükläp bolmady. Gaýtadan synanyşyň. | Could not load favorites. Try again. |

## Implementation notes

- The screen title uses `font-display` (UberMove Bold). Ensure the font is loaded before rendering, or use a fallback `font-sans`.
- When favorites API ships, replace the empty state with a `FlatList` of listing cards.

## Design archive mapping

- `app-shell.html` tab "Favorites" content → `app/(tabs)/favorites.tsx`.
