# 74 — Iconography

## Library

**Lucide** — same icons on web + mobile.

- `lucide-react` for web (admin + public)
- `lucide-react-native` for mobile
- Open source (ISC license)
- 1000+ icons
- Tree-shakable (only imported icons end up in the bundle)
- Stroke-based, consistent visual style

## Style

- **Stroke width: 2px** (default for Lucide; do not change)
- **Round line caps + joins** (default)
- **Single color** (theme-aware; resolves to `colors.textPrimary` by default; can override)
- **No filled-icon variants** — always outline (consistency > variety)

## Sizes

| Size | Pixels | Use |
|---|---|---|
| `xs` | 14 | Inline with text |
| `sm` | 16 | Buttons, list items |
| `base` | 20 | Default for nav icons, action buttons |
| `lg` | 24 | Tab bar icons, prominent CTAs |
| `xl` | 32 | Hero icons, empty states |

## Color rules

- Tab bar inactive: `textTertiary`
- Tab bar active: `primary` (brand red)
- Action button (e.g., Favorite ♥): outline `textSecondary` → filled `primary` when active
- Icon-in-text: inherits text color
- Status icons: their semantic color (`success` / `warning` / `error` / `info`)

## Custom icons

If Lucide doesn't have what we need:

1. Check Lucide first (1000+ icons; usually has it)
2. If still missing: design a custom SVG matching Lucide style (2px stroke, round caps, 24×24 viewbox)
3. Add to `packages/ui/icons/custom/` with named export
4. **Don't mix in icons from other sets** (Material, Phosphor, FontAwesome) — style inconsistency

## Specific icon assignments

Common icons we'll use heavily (lock down their Lucide names so we're consistent):

| Concept | Lucide name |
|---|---|
| Favorite | `Heart` (outline) / `Heart` filled (with `fill` prop) |
| Chat / Message | `MessageSquare` |
| Phone call | `Phone` |
| Search | `Search` |
| Filter | `SlidersHorizontal` |
| Settings | `Settings` |
| User / Profile | `User` |
| Group / Users | `Users` |
| Notification | `Bell` |
| Block | `Ban` |
| Report | `Flag` |
| Share | `Share2` |
| More menu | `MoreHorizontal` (web) / `MoreVertical` (mobile) |
| Close | `X` |
| Back | `ChevronLeft` |
| Forward | `ChevronRight` |
| Check | `Check` |
| Add | `Plus` |
| Remove | `Minus` |
| Delete | `Trash2` |
| Edit | `Pencil` |
| Camera | `Camera` |
| Image | `Image` |
| Video | `Video` |
| Upload | `Upload` |
| Download | `Download` |
| Eye (view) | `Eye` |
| Star (highlight) | `Star` |
| Verified / PRO | `BadgeCheck` |
| Sold | `CheckCircle` |
| Garage | `Garage` (or `Car`) |
| Calendar | `Calendar` |
| Location | `MapPin` |
| Region | `Map` |
| Globe | `Globe` |
| Sun / Moon (theme) | `Sun` / `Moon` |

## Accessibility

- Every interactive icon has an accessible label: `aria-label` (web) or `accessibilityLabel` (RN)
- Icons paired with text don't need explicit labels (label is the text)
- Decorative icons set `aria-hidden="true"` (web) or `accessibilityElementsHidden` (RN)

## References

- Token source: `packages/ui/icons/` (just the named export aliases; no icon files)
- Lucide docs: <https://lucide.dev/>
- [77-accessibility.md](77-accessibility.md)
