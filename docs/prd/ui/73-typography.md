# 73 — Typography

## Font family

**Inter** for everything except mono.

- Open-source (SIL Open Font License)
- Excellent Cyrillic + Latin Extended coverage (Turkmen Latin chars supported)
- Weights: 400 / 500 / 600 / 700 — all loaded
- Already used in the previous Flutter app — visual continuity

Mono: **Menlo** (system fallback to monospace). Used for VINs, prices in tabular contexts.

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

15px base (not 14 or 16) is chosen for slightly-better readability on TM users' typically smaller-than-flagship phone screens.

## Usage map

| UI element | Size | Weight | Line height |
|---|---|---|---|
| Page H1 | 2xl | bold | snug |
| Section H2 | xl | semibold | snug |
| Sub-section H3 | lg | semibold | snug |
| Body | base | regular | normal |
| Body emphasized | base | medium | normal |
| Helper / caption | sm | regular | normal |
| Tiny / badge | xs | medium | tight |
| Mono price | base | semibold | normal |
| Mono VIN | sm | regular | normal |
| Button label | base | medium | tight |
| Tab label | sm | medium | tight |
| Form label | sm | medium | snug |
| Form input | base | regular | normal |
| Form error | sm | regular | snug |

## Hierarchy rules

- **Max 3 type sizes per screen.** If you need a 4th, you're over-designing.
- **Weight, not size, for emphasis** within body text (use `medium`, not jump to `lg`)
- **Headings never use more than `bold`** — no extra-bold or black weights
- **All-caps reserved for labels only** (badges, tabs) — never for headings or body

## Multilingual considerations

### Russian (Cyrillic)

- Inter handles Russian well
- Cyrillic characters have slightly higher x-height than Latin → spacing may need fine-tuning
- Line height `normal` (1.5) is safe; avoid `tight` for paragraph text in Russian

### Turkmen (Latin extended)

- Inter handles Turkmen Latin extension (Ä, Ç, Ň, Ö, Ş, Ü, Ý, Ž) cleanly
- No special handling required

### English

- Default; everything works

## Letter spacing

| Token | Value | Use |
|---|---|---|
| `tight` | -0.02em | Large display text (4xl+) |
| `normal` | 0 | Default (everything else) |
| `wide` | 0.04em | All-caps labels |

## Numbers

- Tabular numbers ENABLED for prices, mileage, year — `font-variant-numeric: tabular-nums`
- Mono font for VINs (alignment matters)
- Localized formatting via `Intl.NumberFormat`:
  - Russian/Turkmen: `1 899 000 TMT` (space thousands separator)
  - English: `1,899,000 TMT`

## Long-form (blog post body)

- `lg` size (17px)
- `relaxed` line height (1.65)
- Max paragraph width 65ch (~600px on desktop)
- Comfortable reading on mobile too

## Don'ts

- ❌ Custom fonts loaded at runtime (Inter is bundled, no FOUT)
- ❌ Italic text — Inter italic is fine, but our UI doesn't need it; avoid
- ❌ Underlined text for emphasis (reserved for hyperlinks only)
- ❌ Letter-spacing tweaks beyond the three tokens above

## References

- Token source: `packages/ui/tokens/type.ts`
- [71-design-tokens.md](71-design-tokens.md)
- [77-accessibility.md](77-accessibility.md) — contrast rules
