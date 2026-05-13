# 78 — Component library

## Where it lives

- **Web + admin**: `packages/ui/components/` — shadcn/ui copies (Radix primitives + Tailwind)
- **Mobile**: `apps/mobile/src/components/` — React Native re-implementations with the same names + props

Same vocabulary across platforms; different implementations because rendering primitives differ.

## Components in MVP (Phase 1)

| Component | Web (shadcn) | Mobile (RN) | Page |
|---|---|---|---|
| **Button** | ✓ shadcn | ✓ Pressable + variants | [components/78-01-button.md](components/78-01-button.md) |
| **Input** | ✓ shadcn | ✓ TextInput wrapper | [components/78-02-input.md](components/78-02-input.md) |
| **Card** | ✓ shadcn-derived | ✓ View wrapper | [components/78-03-card.md](components/78-03-card.md) |
| **List** | ✓ basic shadcn | ✓ FlatList/ScrollView | [components/78-04-list.md](components/78-04-list.md) |
| **Modal / Sheet** | ✓ shadcn Dialog + Sheet | ✓ react-native-bottom-sheet | [components/78-05-modal-sheet.md](components/78-05-modal-sheet.md) |
| **Toast / Snackbar** | ✓ shadcn-derived | ✓ Custom Toast | [components/78-06-toast-snackbar.md](components/78-06-toast-snackbar.md) |
| **Tabs / Nav** | ✓ shadcn Tabs | ✓ react-navigation tabs | [components/78-07-tabs-nav.md](components/78-07-tabs-nav.md) |
| **Form controls** (Toggle/Switch/Checkbox/Radio/Slider) | ✓ shadcn | ✓ RN equivalents | [components/78-08-form-controls.md](components/78-08-form-controls.md) |
| **Avatar** | ✓ shadcn | ✓ Image wrapper | [components/78-09-avatar.md](components/78-09-avatar.md) |
| **Badge** | ✓ shadcn | ✓ View wrapper | [components/78-10-badge.md](components/78-10-badge.md) |
| **Skeleton** (loader) | ✓ shadcn | ✓ Custom shimmer | [components/78-11-skeleton.md](components/78-11-skeleton.md) |

## Components NOT in MVP (deferred)

- DataTable (admin-only; using a simple HTML table in MVP)
- DatePicker (forms use platform-native pickers)
- Combobox (autocomplete — use Input + filtered list for now)
- Drawer (web — defer)
- Command palette (defer)
- Carousel (handled per-feature, not a generic component yet)

## Variants approach

Each component supports a small set of variants via props:

```tsx
<Button intent="primary" size="md" loading={false}>Sell my car</Button>

<Card padding="md" elevation="sm">...</Card>

<Input size="md" error={false} disabled={false} />
```

Variants are limited and intentional. No "what if we had 20 button colors" sprawl.

## Composition over prop explosion

If a component grows too many props, split it:

- `Modal` (the chrome) + content composed by the consumer
- `List` (the container) + `ListItem` (each row)
- `Card` (the surface) + `CardHeader`, `CardBody`, `CardFooter` slots

shadcn's pattern matches this — we follow it.

## Theme integration

All components read from `packages/ui/tokens/` either via Tailwind classes (web) or via NativeWind / theme context (mobile).

When tokens change, components update automatically.

## Per-component pages

Each component has a dedicated PRD page in [`components/`](components/) covering:

1. Purpose
2. When to use it (and when not)
3. Variants (intent, size, state)
4. All states (default, hover, active, disabled, loading, error, success)
5. Accessibility notes
6. Implementation snippet (Tailwind classnames + RN equivalent)

## Adding a new component

1. Is it generic (reusable across features) or one-off?
   - If one-off, it belongs in the consuming app, not `packages/ui/`
2. Does shadcn have it?
   - If yes, copy from shadcn CLI; theme to our tokens; document.
3. Does it need a mobile equivalent?
   - If yes, implement parallel in `apps/mobile/src/components/`
4. Add a per-component PRD page in `components/`
5. Add to the table at the top of this file

## References

- shadcn docs: <https://ui.shadcn.com/>
- [71-design-tokens.md](71-design-tokens.md)
- [79-web-vs-mobile.md](79-web-vs-mobile.md)
