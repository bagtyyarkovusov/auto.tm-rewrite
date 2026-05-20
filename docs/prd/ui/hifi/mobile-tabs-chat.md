# Hi-Fi — Mobile Chat / Messages Tab

> Issue: #124 — apply wizard design handoff to app shell, auth, and listing wizard  
> Maps to: `apps/mobile/app/(tabs)/chat.tsx`  
> Derived from wireframe: `docs/prd/ui/wireframes/mobile-tabs-chat.md`  
> Design archive source: `app-shell.html` (Chat tab content)

==============================================
HIGH-FIDELITY DESIGN — Mobile Chat / Messages Tab
Platform: mobile
Mode: light + dark
==============================================

## Purpose

Conversation list for buyer-seller messaging. Currently a stub empty state with branded chrome.

## Layout

```text
┌────────────────────────────────────────────┐
│ safe-top                                   │
│ Messages                                   │
├────────────────────────────────────────────┤
│                                            │
│        ◐ MessageSquare (56px, neutral-400) │
│                                            │
│       No messages yet                      │
│  Conversations with buyers and sellers     │
│  will appear here once messaging launches  │
│  in S7.                                    │
│                                            │
└────────────────────────────────────────────┘
```

## Token map

### Backgrounds + surfaces
- Root: `bg-background`
- Empty state: transparent

### Typography
- Screen title "Messages": `font-display`, `text-[32px] leading-tight font-bold tracking-tight text-foreground`
- Empty heading: `font-display`, `text-xl font-bold text-foreground`
- Empty body: `text-base text-neutral-500`
- Anonymous CTA: `text-base font-medium text-foreground underline`

### Spacing
- Title: `px-5 pt-safe pb-4`
- Empty state: `px-8 py-12`
- Icon-to-heading gap: `gap-4` (16px)
- Heading-to-body gap: `gap-2` (8px)

### Icons
- Empty state: `MessageSquare`, 56×56, `text-neutral-400`

## Component shape

### Implementation (mobile — NativeWind v4 + RNR)

```tsx
import { View } from "react-native";
import { MessageSquare } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

export default function ChatScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-safe pb-4">
        <Text className="font-display text-[32px] leading-tight font-bold tracking-tight text-foreground">
          Messages
        </Text>
      </View>

      <View className="flex-1 items-center justify-center px-8 py-12 gap-4">
        <Icon as={MessageSquare} className="size-14 text-neutral-400" />
        <Text className="font-display text-xl font-bold text-foreground">
          No messages yet
        </Text>
        <Text className="text-base text-neutral-500 text-center max-w-[280px]">
          Conversations with buyers and sellers will appear here once messaging launches in S7.
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
Skeleton list:
```tsx
<View className="px-5 gap-3">
  <Skeleton className="h-[72px] rounded-xl" />
  <Skeleton className="h-[72px] rounded-xl" />
</View>
```

### Empty
Empty state block shown above.

### Error
Inline retry row:
```tsx
<View className="mx-5 mt-2 p-3 rounded-lg bg-destructive/10 flex-row items-center gap-2">
  <Icon as={AlertCircle} className="size-4 text-destructive" />
  <Text className="text-sm font-medium text-destructive">
    Could not load messages. Try again.
  </Text>
</View>
```

### Offline
Cached conversation list if available; else empty state with offline helper:
```tsx
<Text className="text-sm text-neutral-400 text-center mt-2">
  You are offline.
</Text>
```

### Authenticated-only
If anonymous, replace empty state with:
```tsx
<View className="flex-1 items-center justify-center px-8 py-12 gap-4">
  <Icon as={MessageSquare} className="size-14 text-neutral-400" />
  <Text className="font-display text-xl font-bold text-foreground">
    Sign in to see messages
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

- **Contrast ratios**: `text-foreground` on `bg-background` ≥ 21:1. `text-neutral-500` on `bg-background` ~ 5.4:1 (pass AA body).
- **Tap targets**: Sign-in CTA 52×min-width (pass).
- **Focus-visible**: Sign-in button uses default RNR focus ring.
- **Screen reader**: Empty state icon decorative; hide from AT.
- **Reading order**: Title → Icon → Heading → Body → CTA (if present).

## Trilingual copy

| Key | RU | TK | EN |
|---|---|---|---|
| `screen.title` | Сообщения | Habarlaşma | Messages |
| `empty.heading` | Пока нет сообщений | Habar ýok | No messages yet |
| `empty.body` | Переписка с покупателями и продавцами появится здесь после запуска мессенджера в S7. | Satyjylar we alyjylar bilen habarlaşyk S7-de habarlaşyk gornüşi işe girizilenden soň şu ýerde görüner. | Conversations with buyers and sellers will appear here once messaging launches in S7. |
| `anon.cta` | Войдите, чтобы видеть сообщения | Habarlary görmek üçin ulgama giriň | Sign in to see messages |
| `error.load` | Не удалось загрузить сообщения. Попробуйте снова. | Habarlary ýükläp bolmady. Gaýtadan synanyşyň. | Could not load messages. Try again. |

## Implementation notes

- Tab label remains "Chat"; screen title is "Messages" per design archive.
- When messaging API ships, replace empty state with a `FlatList` of conversation rows.

## Design archive mapping

- `app-shell.html` tab "Chat" content → `app/(tabs)/chat.tsx`.
