# 73 — Typography

## Semantic font families

Typography is platform-specific behind shared semantic names:

| Semantic use | Web + admin | Mobile |
|---|---|---|
| Body / `font-sans` | Inter | UberMoveText (Light, Regular, Medium, Bold) |
| Heading / `font-heading` | Inter with heading weight | UberMove (Medium, Bold) |
| Mono / `font-mono` | Menlo, monospace | UberMove Mono on iOS; Menlo/system monospace fallback on Android |

The shared defaults live in `packages/ui/tokens/type.ts`. Mobile deliberately overrides the family mappings in `apps/mobile/tailwind.config.js` and bundles fonts through `apps/mobile/app/_layout.tsx`. Current mobile usage is documented in `apps/mobile/CONTEXT.md`; a mobile design must not specify Inter from the shared default.

## Type scale (from tokens)

```
xs   11   Tiny labels, badge counts
sm   13   Captions, helper text, timestamps
base 15   Default body text
lg   17   Important body, list item titles
xl   20   Section headings
2xl  24   Page headings
3xl  30   Hero text
4xl  36   Marketing landing big text
5xl  44   Marketing landing huge text
```

The shared scale uses a 15px base. Platform implementations must preserve readable rendered size and dynamic-text behavior rather than assuming a CSS pixel maps identically on native.

## Mobile type roles

Mobile names its sizes by role (`packages/ui/tokens/mobile.ts`, `mobileType`). Screens use these utilities instead of bracketed sizes.

| Utility | Size / line (dp) | Tracking | Use | Usual face |
|---|---|---|---|---|
| `text-display` | 34 / 40 | -0.4 | Large screen titles, the detail price | UberMove Bold |
| `text-title` | 28 / 34 | -0.3 | Compact screen titles, hero numbers | UberMove Bold |
| `text-headline` | 22 / 28 | -0.2 | Card prices, sheet titles, empty-state titles | UberMove Bold |
| `text-subhead` | 18 / 24 | -0.1 | Section titles, large row titles | UberMoveText Bold |
| `text-body` | 16 / 22 | 0 | Reading and control text | UberMoveText Regular or Medium |
| `text-callout` | 15 / 20 | 0 | Dense rows, the line beside a title | UberMoveText Regular |
| `text-footnote` | 13 / 18 | 0 | Helper text, metadata | UberMoveText Regular |
| `text-caption` | 12 / 16 | 0 | Captions, timestamps, chips on photos | UberMoveText Medium |
| `text-micro` | 11 / 14 | 0.1 | Tab labels, count badges | UberMoveText Medium |

### Weight on mobile

React Native draws a custom font from exactly one file; a weight class on top of the Regular file does not pick the Bold file. Each bundled file is therefore its own family utility:

| Family class | Weight class | Face |
|---|---|---|
| `font-sans` | `font-light` | UberMoveText Light |
| `font-sans` | none, `font-normal` | UberMoveText Regular |
| `font-sans` | `font-medium` | UberMoveText Medium |
| `font-sans` | `font-semibold`, `font-bold` | UberMoveText Bold |
| `font-heading` | none, `font-medium` | UberMove Medium |
| `font-heading` | `font-semibold`, `font-bold` | UberMove Bold |
| `font-mono` | none | UberMove Mono Regular (iOS) |
| `font-mono` | `font-medium` and heavier | UberMove Mono Medium (iOS) |

The `Text` primitive does this mapping (`apps/mobile/lib/font.ts`), so a call site writes `font-heading font-semibold` and gets the Bold file on both platforms. There is no semibold file: `font-semibold` and `font-bold` draw the same face. Hierarchy on mobile comes from three steps: Regular, Medium, Bold.

A raw React Native `Text` or `TextInput` does not go through the primitive; give it the face utility directly (`font-sans-medium`, `font-sans-bold`, `font-heading-bold`).

## Usage map

| UI element | Family | Size | Weight | Line height |
|---|---|---|---|---|
| Page H1 | heading | 2xl | bold | snug |
| Section H2 | heading | xl | semibold | snug |
| Sub-section H3 | heading | lg | semibold | snug |
| Body | sans | base | regular | normal |
| Body emphasized | sans | base | medium | normal |
| Helper / caption | sans | sm | regular | normal |
| Tiny / badge | sans | xs | medium | tight |
| Tabular price | sans + tabular numerals | base | semibold | normal |
| VIN / OTP code | mono | sm / 2xl | regular / semibold | normal / tight |
| Button label | sans | base | medium | tight |
| Tab label | sans | sm | medium | tight |
| Form label | sans | sm | medium | snug |
| Form input | sans | base | regular | normal |
| Form error | sans | sm | regular | snug |

## Hierarchy rules

- **Few sizes per screen.** Web and admin: at most 3. Mobile: one title role, one emphasis role (a price or a section title), body, and one quiet role; a fifth needs a reason.
- **On mobile the price is the loudest text on a card and on Listing detail**, and screen titles are large and heavy.
- **Weight, not size, for emphasis** within body text (use `medium`, not jump to `lg`)
- **Headings never use more than `bold`** — no extra-bold or black weights
- **All-caps reserved for labels only** (badges, tabs) — never for headings or body

## Multilingual considerations

### Russian (Cyrillic)

- Verify the actual platform font and loaded weight with real Russian copy
- Cyrillic can change perceived density → test wrapping and vertical rhythm rather than tightening globally
- Line height `normal` (1.5) is safe; avoid `tight` for paragraph text in Russian

### Turkmen (Latin extended)

- Verify Ä, Ç, Ň, Ö, Ş, Ü, Ý, and Ž in the actual platform font and every used weight
- Test long labels and fallbacks; missing-glyph substitution is a release blocker

### English

- Use as one test locale, never as proof that Russian/Turkmen fit

## Letter spacing

| Token | Value | Use |
|---|---|---|
| `tight` | -0.02em | Large display text (4xl+) |
| `normal` | 0 | Default (everything else) |
| `wide` | 0.04em | All-caps labels |

## Numbers

- Use tabular numerals for prices, mileage, year, and aligned numeric tables where the platform supports them
- Use the semantic mono family for VINs and OTP cells; do not force all prices into mono
- Localized formatting via `Intl.NumberFormat`:
  - Russian/Turkmen: `1 899 000 TMT` (space thousands separator)
  - English: `1,899,000 TMT`

## Long-form (blog post body)

- `lg` size (17px)
- `relaxed` line height (1.65)
- Max paragraph width 65ch (~600px on desktop)
- Comfortable reading on mobile too

## Don'ts

- ❌ Network-downloaded UI fonts or a font-dependent blank first render; mobile fonts are bundled assets
- ❌ Inventing platform-specific family names in screen specs; use `font-sans`, `font-heading`, and `font-mono`
- ❌ Italic text for ordinary UI emphasis
- ❌ Underlined text for emphasis (reserved for hyperlinks only)
- ❌ Letter-spacing tweaks beyond the three tokens above

## References

- Token source: `packages/ui/tokens/type.ts`
- Mobile mapping: `apps/mobile/tailwind.config.js`
- Mobile font loading/current state: `apps/mobile/app/_layout.tsx`, `apps/mobile/CONTEXT.md`
- [71-design-tokens.md](71-design-tokens.md)
- [77-accessibility.md](77-accessibility.md) — contrast rules
