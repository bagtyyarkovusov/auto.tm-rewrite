# Hi-Fi — Mobile Services Tab

> Issue: #124 — apply wizard design handoff to app shell, auth, and listing wizard  
> Maps to: `apps/mobile/app/(tabs)/services.tsx`  
> Derived from wireframe: `docs/prd/ui/wireframes/mobile-tabs-services.md`  
> Design archive source: `app-shell.html` (Services tab content)

==============================================
HIGH-FIDELITY DESIGN — Mobile Services Tab
Platform: mobile
Mode: light + dark
==============================================

## Purpose

Hub for profile, garage, settings, blog, and help. Switches from the current card-grid layout to the design archive's list-row layout for consistency with the wizard picker rows.

## Layout

```text
┌────────────────────────────────────────────┐
│ safe-top                                   │
│ Services                                   │
├────────────────────────────────────────────┤
│ Profile                              >     │
│ Settings                             >     │
│ Bortzhurnal                          >     │
│ Help & Support                       >     │
│                                            │
└────────────────────────────────────────────┘
```

## Token map

### Backgrounds + surfaces
- Root: `bg-background`
- Row press feedback: `active:bg-neutral-100 dark:active:bg-neutral-800`

### Borders + dividers
- Row separator: `border-t border-border` (each row after the first)

### Typography
- Screen title "Services": `font-display`, `text-[32px] leading-tight font-bold tracking-tight text-foreground`
- Row label: `text-base font-medium text-foreground`
- Row chevron: `text-neutral-400` (via Icon class)

### Spacing
- Title: `px-5 pt-safe pb-4`
- Rows horizontal: `px-5`
- Row vertical: `py-3.5` (14px)
- Row internal: `flex-row items-center justify-between`

### Icons
- Chevron: `ChevronRight`, 16×16, `text-neutral-400`

## Component shape

### Implementation (mobile — NativeWind v4 + RNR)

```tsx
import { Pressable, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

const ROWS = [
  { label: "Profile", route: "/me/profile" },
  { label: "Settings", route: "/me/settings" },
  { label: "Bortzhurnal", route: "/me/blog" },
  { label: "Help & Support", route: "/help" },
];

export default function ServicesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-safe pb-4">
        <Text className="font-display text-[32px] leading-tight font-bold tracking-tight text-foreground">
          Services
        </Text>
      </View>

      <View className="mx-5">
        {ROWS.map((row, i) => (
          <Pressable
            key={row.label}
            className={`flex-row items-center justify-between py-3.5 ${
              i > 0 ? "border-t border-border" : ""
            } active:opacity-70`}
            onPress={() => { /* toast or navigate */ }}
          >
            <Text className="text-base font-medium text-foreground">{row.label}</Text>
            <Icon as={ChevronRight} className="size-4 text-neutral-400" />
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
```

## Customization plan

| Primitive | Path | File | Details |
|---|---|---|---|
| `Pressable` | Custom composition | `apps/mobile/app/(tabs)/services.tsx` | List row uses `Pressable` (not RNR `Button`) because it needs full-width tap with chevron alignment. `active:opacity-70` provides press feedback. |

## States

### Default
List rows as shown above.

### Loading
Skeleton rows:
```tsx
<View className="mx-5 gap-0">
  {Array.from({ length: 4 }).map((_, i) => (
    <Skeleton key={i} className={`h-[52px] ${i > 0 ? "mt-0" : ""}`} />
  ))}
</View>
```

### Empty
N/A — rows are static chrome.

### Error
N/A — static rows don't error.

### Offline
Rows remain visible; individual screens handle offline on navigation.

## Motion

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Row press | opacity 0.7 | `fast` (150ms) | `standard` |

Reduced motion: instant opacity change.

## Accessibility

- **Contrast ratios**: `text-foreground` on `bg-background` ≥ 21:1. `text-neutral-400` chevron ≥ 3:1 (pass AA for UI components).
- **Tap targets**: Each row 52px minimum height with `py-3.5` (pass).
- **Focus-visible**: `Pressable` does not show a focus ring by default. If keyboard navigation is needed, wrap in a `View` with `focus:` border utility, or accept that mobile is touch-first.
- **Screen reader**: Each row needs `accessibilityRole="button"` + `accessibilityLabel={row.label}`.
- **Reading order**: Title → Profile → Settings → Bortzhurnal → Help & Support.

## Trilingual copy

| Key | RU | TK | EN |
|---|---|---|---|
| `screen.title` | Сервисы | Hyzmatlar | Services |
| `row.profile` | Профиль | Profil | Profile |
| `row.settings` | Настройки | Sazlamalar | Settings |
| `row.blog` | Бортжурнал | Bortjurnal | Bortzhurnal |
| `row.help` | Помощь и поддержка | Kömek we goldaw | Help & Support |

## Implementation notes

- Switched from card-grid to list-row layout to match the design archive.
- No left icons on rows per the design archive; text + chevron only.
- All routes are S5/S6 scope; today they show a toast or no-op.
- `active:opacity-70` on `Pressable` gives immediate visual feedback.

## Design archive mapping

- `app-shell.html` tab "Services" content → `app/(tabs)/services.tsx`.
