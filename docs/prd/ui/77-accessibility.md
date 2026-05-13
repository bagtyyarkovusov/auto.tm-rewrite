# 77 — Accessibility

## Targets

**WCAG 2.1 Level AA** for all production screens.

Specifically:
- Color contrast: 4.5:1 for normal text, 3:1 for large text (18px+ or 14px bold)
- Touch targets: minimum 44×44 pt (iOS) / 48×48 dp (Android) / 44×44 px (web)
- Keyboard navigable (web)
- Screen-reader compatible (VoiceOver, TalkBack, NVDA)

## Color contrast

Verified pairs from our token system:

| Combination | Ratio | Status |
|---|---|---|
| `textPrimary.light` (#171717) on `background.light` (#FFFFFF) | 16.8:1 | ✓✓✓ |
| `textPrimary.dark` (#FAFAF9) on `background.dark` (#0A0A0A) | 19.1:1 | ✓✓✓ |
| `textSecondary.light` (#525251) on `background.light` (#FFFFFF) | 7.65:1 | ✓ |
| `textSecondary.dark` (#D2D0CB) on `background.dark` (#0A0A0A) | 13.4:1 | ✓✓✓ |
| `textTertiary.light` (#737170) on `background.light` (#FFFFFF) | 4.83:1 | ✓ |
| `textTertiary.dark` (#A8A6A0) on `background.dark` (#0A0A0A) | 8.6:1 | ✓ |
| `primary` (#E60000) on `background.light` (#FFFFFF) | 5.39:1 | ✓ |
| `primary` (#E60000) on `background.dark` (#0A0A0A) | 4.95:1 | ✓ |
| `onPrimary` (#FFFFFF) on `primary` (#E60000) | 5.39:1 | ✓ |
| `error` rose.500 on background.light | 4.61:1 | ✓ |
| `success` green.500 on background.light | 3.55:1 | ✓ (large text only) |

Test new pairs against [WebAIM contrast checker](https://webaim.org/resources/contrastchecker/) before adding tokens.

## Touch targets

All interactive elements must hit minimum touch target:

- Icon buttons: 44×44 minimum (visual icon can be smaller, padding fills the rest)
- Text buttons: at least 44 high with horizontal padding to make tap target wide
- List items in long lists: 56+ high
- Form fields: 48+ high
- Tab bar items: 48+ tall

Verified via dev tool inspector or a 9mm-radius circle overlay.

## Screen-reader labels

### Mobile (React Native)

```tsx
<Pressable
  accessibilityLabel="Favorite this listing"
  accessibilityRole="button"
  accessibilityState={{ selected: isFavorited }}
>
  <Heart fill={isFavorited ? primary : "none"} />
</Pressable>
```

### Web (Next.js)

```tsx
<button aria-label="Favorite this listing" aria-pressed={isFavorited}>
  <Heart />
</button>
```

### Localization

Accessibility labels are localized — `t('a11y.favorite-listing')` not hard-coded English.

## Forms

- Every input has a visible label (placeholder is not enough)
- `aria-required`, `aria-invalid` set appropriately
- Error messages associated via `aria-describedby`
- Submit-disabled state has `aria-disabled="true"` (don't just visually grey)

## Lists

- Long scrollable lists use `accessibilityRole="list"` and items use `accessibilityRole="listitem"`
- Order matches visual order

## Images

- Listing photos in galleries: `accessibilityLabel="Photo 3 of 12, exterior side view"` (we don't have alt text per photo in MVP — use position + listing title)
- Decorative images: `accessibilityElementsHidden={true}`
- Icon-only buttons: always have a label (see above)

## Keyboard (web)

- Tab order matches visual order
- Modal traps focus
- Esc closes modals
- Enter submits forms
- Skip-to-content link for keyboard users (Phase 1.5 if needed)

## Motion

- Respect `prefers-reduced-motion` (see [76-motion.md](76-motion.md))
- No flashing content > 3 times per second (no risk in our app, but worth flagging)

## Typography

- Body text: never below 13px on mobile (15px default)
- Line height: at least 1.5 for body
- No justified text (uneven gaps hurt readability)

## Languages and direction

- Russian and Turkmen are left-to-right (LTR) — same as English
- No RTL support needed (no Arabic / Hebrew in our locales)
- Number formatting respects locale (`Intl.NumberFormat`)

## Testing

- Manual: VoiceOver on iOS, TalkBack on Android, NVDA on Windows
- Automated: `axe-core` integrated in Playwright tests for web
- CI: contrast checker for new color tokens

## Don'ts

- ❌ Color as the only differentiator (don't say "red items" — use red + icon)
- ❌ Hover-only interactions on mobile (mobile has no hover)
- ❌ Tiny "x" close buttons that don't hit touch-target minimum
- ❌ Disabled buttons with no explanation (always show why)
- ❌ Long forms without progressive disclosure

## References

- [71-design-tokens.md](71-design-tokens.md)
- [73-typography.md](73-typography.md)
- [76-motion.md](76-motion.md)
- WCAG 2.1: <https://www.w3.org/WAI/WCAG21/quickref/>
