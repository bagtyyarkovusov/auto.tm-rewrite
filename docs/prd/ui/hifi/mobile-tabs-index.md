# Hi-Fi — Mobile Search / Feed Tab

> Issue: #124 — apply wizard design handoff to app shell, auth, and listing wizard  
> Maps to: `apps/mobile/app/(tabs)/index.tsx`  
> Derived from wireframe: `docs/prd/ui/wireframes/mobile-tabs-index.md`  
> Design archive source: `app-shell.html` (Home tab content)

==============================================
HIGH-FIDELITY DESIGN — Mobile Search / Feed Tab
Platform: mobile
Mode: light + dark
==============================================

## Purpose

Primary browse surface. Currently a stub; design handoff gives it a branded header and search affordance that establishes the AutoTM visual identity immediately.

## Layout

```text
┌────────────────────────────────────────────┐
│ safe-top                                   │
│ AutoTM                         ◐ Search    │
├────────────────────────────────────────────┤
│                                            │
│  ┌────────────────────────────────────┐    │
│  │ ◐ Search…                          │    │
│  └────────────────────────────────────┘    │
│                                            │
│                                            │
│         ◐ House (56px, neutral-400)        │
│                                            │
│         Feed                               │
│  Personalized listings will appear here    │
│  once the recommendation engine ships.     │
│                                            │
└────────────────────────────────────────────┘
```

## Token map

### Backgrounds + surfaces
- Root: `bg-background`
- Header: `bg-background`
- Search input: `bg-background` with `border border-border`
- Empty state icon area: transparent

### Borders + dividers
- Search input border: `border border-border` (1.5px requires `border-[1.5px]` bracket; RNR `Input` defaults to 1px)

### Typography
- Screen title "AutoTM": `font-display` (UberMove Bold), `text-[32px] leading-tight font-bold tracking-tight text-foreground`
- Empty heading "Feed": `font-display`, `text-xl font-bold text-foreground`
- Empty body: `text-base text-neutral-500` (close to design archive `#4b4b4b` / `#737170`)
- Search placeholder: `text-base text-neutral-400`

### Spacing
- Header horizontal: `px-5` (20px)
- Header vertical: `pt-safe pb-4`
- Search bar horizontal: `px-5`
- Empty state padding: `px-8 py-12`
- Icon-to-heading gap: `gap-4` (16px)
- Heading-to-body gap: `gap-2` (8px)

### Radius
- Search input: `rounded-lg` (8px)
- Search icon button: `rounded-full` (circular hit area)

### Icons
- Search icon (header): `Search`, 22×22, `text-foreground`
- Search icon (input leading): `Search`, 20×20, `text-neutral-400`
- Empty state: `Home`, 56×56, `text-neutral-400`

## Component shape

### Implementation (mobile — NativeWind v4 + RNR)

```tsx
import { View } from "react-native";
import { Home, Search } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";

export default function IndexScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-5 pt-safe pb-4 flex-row items-center justify-between">
        <Text className="font-display text-[32px] leading-tight font-bold tracking-tight text-foreground">
          AutoTM
        </Text>
        <View className="w-10 h-10 rounded-full items-center justify-center active:bg-neutral-100 dark:active:bg-neutral-800">
          <Icon as={Search} className="size-[22px] text-foreground" />
        </View>
      </View>

      {/* Search bar */}
      <View className="px-5 pb-4">
        <View className="flex-row items-center h-[52px] px-3.5 border-[1.5px] border-border rounded-lg bg-background">
          <Icon as={Search} className="size-5 text-neutral-400 mr-2" />
          <Input
            className="flex-1 border-0 bg-transparent text-base text-foreground"
            placeholder="Make, model, or keyword…"
            placeholderTextColor="hsl(var(--muted-foreground))"
          />
        </View>
      </View>

      {/* Empty state */}
      <View className="flex-1 items-center justify-center px-8 py-12 gap-4">
        <Icon as={Home} className="size-14 text-neutral-400" />
        <Text className="font-display text-xl font-bold text-foreground">
          Feed
        </Text>
        <Text className="text-base text-neutral-500 text-center max-w-[260px]">
          Personalized listings will appear here once the recommendation engine ships in S5.
        </Text>
      </View>
    </SafeAreaView>
  );
}
```

## Customization plan

| Primitive | Path | File | Details |
|---|---|---|---|
| `Input` | Bracket override at call site | `apps/mobile/app/(tabs)/index.tsx` | Composed inside a `View` with `border-[1.5px]` because RNR `Input` defaults to 1px and the design archive uses 1.5px inputs. |
| `Text` | Font class | `apps/mobile/app/(tabs)/index.tsx` | `font-display` requires `expo-font` loading of UberMove Bold. If font fails to load, fall back to `font-sans` (Inter). |

## States

### Default
Branded header + search bar + empty state as shown above.

### Loading
Skeleton shimmer for 2–3 feed cards (not shown today; no feed API). Use `Skeleton` component from RNR:
```tsx
<View className="px-5 gap-3">
  <Skeleton className="h-[180px] rounded-xl" />
  <Skeleton className="h-[180px] rounded-xl" />
</View>
```

### Empty
Empty state block shown above.

### Error
Inline error row below search bar:
```tsx
<View className="mx-5 mt-2 p-3 rounded-lg bg-destructive/10 flex-row items-center gap-2">
  <Icon as={AlertCircle} className="size-4 text-destructive" />
  <Text className="text-sm font-medium text-destructive">
    Could not load feed. Try again.
  </Text>
</View>
```

### Offline
Subtle top banner:
```tsx
<View className="px-5 py-2 bg-warning-500/10 flex-row items-center gap-2">
  <Icon as={WifiOff} className="size-4 text-warning-500" />
  <Text className="text-sm text-warning-500">You are offline.</Text>
</View>
```

## Motion

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Search input focus | border-color `border-border` → `border-foreground` + shadow ring | `fast` (150ms) | `standard` |
| Search icon press | `bg-neutral-100` fade-in | `fast` (150ms) | `standard` |
| Skeleton shimmer | translateX loop | `base` (250ms) × 2 | `linear` |

Reduced motion: instant border color change; disable skeleton shimmer.

## Accessibility

- **Contrast ratios**: `text-foreground` on `bg-background` ≥ 21:1 (pass). `text-neutral-500` on `bg-background` ~ 5.4:1 (pass AA body). `text-neutral-400` icons ≥ 3:1 (pass AA for UI components).
- **Tap targets**: Header search icon 40×40; search bar 52px height; both meet 44×44 minimum when padding is included.
- **Focus-visible**: Search input shows 2px `border-foreground` + `shadow-sm` ring on focus.
- **Screen reader**: Search icon button needs `accessibilityLabel="Search listings"`. Search input needs ` accessibilityLabel="Search by make, model, or keyword"`.
- **Reading order**: Title → Search icon → Search bar → Empty state icon → Heading → Body.

## Trilingual copy

| Key | RU | TK | EN |
|---|---|---|---|
| `screen.title` | AutoTM | AutoTM | AutoTM |
| `search.placeholder` | Марка, модель или ключевое слово… | Marka, model ýa-da söz… | Make, model, or keyword… |
| `empty.heading` | Лента | Lenta | Feed |
| `empty.body` | Персонализированные объявления появятся здесь после запуска рекомендательной системы в S5. | Şahsylaşdyrylan bildirişler S5-de maslahat beriş ulgamy işe girizilenden soň şu ýerde görüner. | Personalized listings will appear here once the recommendation engine ships in S5. |
| `error.load` | Не удалось загрузить ленту. Попробуйте снова. | Lentany ýükläp bolmady. Gaýtadan synanyşyň. | Could not load feed. Try again. |

## Implementation notes

- `font-display` is a custom font family loaded via `expo-font` (UberMove Bold). Add to `tailwind.config.js` `theme.extend.fontFamily`: `display: ["UberMove", "system-ui", "sans-serif"]`.
- The search bar is NOT sticky in this version (no scrollable content yet). When feed ships, consider making it sticky under the header.
- Search bar uses a composed `View` wrapper rather than raw `Input` because the design requires a leading search icon inside the field.

## Design archive mapping

- `app-shell.html` tab "Home" content → `app/(tabs)/index.tsx`.
