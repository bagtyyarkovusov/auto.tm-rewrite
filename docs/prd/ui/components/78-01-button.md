# 78-01 — Button

## Purpose

Primary action element. Triggers a single action: navigation, submission, toggle.

## When to use

- Submit forms
- Trigger destructive or constructive actions
- Open modals or sheets
- Primary CTAs ("Sell my car", "Call seller")

## When NOT to use

- Navigating between routes that aren't actions — use a link instead
- Toggling state — use a Switch
- Selecting one of many — use Tabs or Radio
- Picking a value — use Input or Select

## Variants

### Intent

| Intent | Use | Color |
|---|---|---|
| `primary` | Main action on the screen | Brand red bg, white text |
| `secondary` | Alternative action, less emphasized | Neutral surface, dark text + border |
| `tertiary` | Low-emphasis action | Text-only, no background |
| `destructive` | Delete / ban / suspend | Rose-500 bg, white text |
| `success` | Confirm / approve (admin only) | Green-500 bg, white text |

### Size

| Size | Height | Padding | Font size |
|---|---|---|---|
| `sm` | 32 | 12 horizontal | `sm` (13) |
| `md` (default) | 44 | 16 horizontal | `base` (15) |
| `lg` | 52 | 20 horizontal | `lg` (17) |

### Shape

- `default` — radius `md` (8)
- `pill` — radius `full` (rounded)

## States

| State | Visual |
|---|---|
| Default | Solid bg (intent color) |
| Hover (web) | Bg darkens by one step (`primary` → `primaryHover`) |
| Active / pressed | Bg darkens further; scale 0.96 (mobile only); opacity 0.7 |
| Focused (keyboard) | 2px outline in `primary` color, 2px offset |
| Disabled | Opacity 0.5; cursor `not-allowed`; no hover/active effects |
| Loading | Spinner replaces label; button is disabled; min-width preserved (no layout shift) |

## With icon

- Icon-left: `<Heart /> Favorite` — icon at `base` size, 8px gap
- Icon-right: `Continue <ChevronRight />`
- Icon-only: requires `accessibilityLabel`; touch target ≥ 44 even if visual icon is small

## Accessibility

- `accessibilityRole="button"` (RN) / native `<button>` (web)
- Loading state: `aria-busy="true"`
- Disabled: `aria-disabled="true"`
- Icon-only buttons MUST have `accessibilityLabel` / `aria-label`

## Implementation (web)

```tsx
<Button intent="primary" size="md" onClick={handleSubmit}>
  Sell my car
</Button>

<Button intent="secondary" size="sm">Cancel</Button>

<Button intent="destructive" loading={isDeleting}>
  Delete listing
</Button>
```

## Implementation (mobile)

```tsx
<Button
  intent="primary"
  size="md"
  onPress={handleSubmit}
  loading={isSubmitting}
>
  Sell my car
</Button>
```

Both use the same prop names. Internally web is a `<button>` with Tailwind classes, mobile is `Pressable` with NativeWind classes.

## Don'ts

- ❌ Multiple `primary` buttons on the same screen — pick one
- ❌ Buttons with > 3 words for the label
- ❌ Sentence-case label ("Sell my car") rather than title-case ("Sell My Car")
- ❌ Disabled buttons without explanation (use a tooltip / helper text)
