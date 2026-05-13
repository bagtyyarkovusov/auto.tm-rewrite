# 78-08 — Form controls (Toggle, Switch, Checkbox, Radio, Slider, Select)

## Purpose

Smaller form primitives that handle binary state, choice, and ranges.

## Components

| Component | Use |
|---|---|
| **Switch** | On/off toggle for a setting |
| **Checkbox** | Boolean choice (especially in groups) |
| **Radio** | One-of-N choice (in a group) |
| **Slider** | Range value (price, mileage) |
| **Select** | Dropdown of options |
| **Stepper** | Numeric +/- (rarely used; Slider usually better) |

---

## Switch

### When to use

- "Notifications enabled" yes/no
- "Public Garage" yes/no
- Dark mode toggle

### Anatomy

```
[On/Off indicator track]  Setting label  (helper)
```

### Specs

- Track width: 44, height: 24
- Knob: 20×20, rounded full
- Off: track `neutral-300`, knob right `neutral-0`
- On: track `primary`, knob `neutral-0` (left)
- Disabled: opacity 0.5
- Animation: knob slides `fast` (150ms), color crossfades

### Implementation

```tsx
<Switch
  label="Notifications enabled"
  helperText="Receive push notifications for new matches"
  checked={enabled}
  onCheckedChange={setEnabled}
/>
```

---

## Checkbox

### When to use

- Multi-select from a list
- "Accept terms" before submit

### Specs

- Size: 20×20 (clickable area larger, 44×44 touch target)
- Unchecked: 1.5px border `neutral-300`
- Checked: bg `primary`, checkmark icon `onPrimary`
- Indeterminate state for "some selected": dash instead of check
- Disabled: opacity 0.5

### Implementation

```tsx
<Checkbox
  label="Accept Terms & Privacy"
  checked={accepted}
  onCheckedChange={setAccepted}
/>
```

---

## Radio (radio group)

### When to use

- One-of-N choice presented as a list
- Listing condition: New / Used
- Seller type: Private / Dealer

### Specs

- Size: 20 outer ring, 10 inner dot
- Border: `neutral-300` unchecked, `primary` checked
- Selected: inner dot `primary`
- Disabled: opacity 0.5

### Implementation

```tsx
<RadioGroup value={condition} onValueChange={setCondition}>
  <Radio value="new" label="New" />
  <Radio value="used" label="Used" />
</RadioGroup>
```

---

## Slider

### When to use

- Price range filter
- Mileage range filter
- Year range filter

### Variants

- `single` — one value
- `range` — two values (min, max)

### Specs

- Track height: 4
- Thumb: 20×20 round, `primary` filled with shadow
- Active range fill: `primary`
- Inactive: `neutral-200`
- Drag haptic on mobile (light tick on value change)

### Implementation

```tsx
<Slider
  variant="range"
  min={0}
  max={5000000}
  step={50000}
  value={priceRange}
  onValueChange={setPriceRange}
  formatLabel={v => `${v} TMT`}
/>
```

---

## Select

### When to use

- One-of-N where the list is long (10+) or unknown
- Region picker, currency picker

### Variants

- `inline` — looks like an Input with a chevron, opens a popover (web) / bottom sheet (mobile)
- `picker` — opens platform-native picker on mobile

### Anatomy

```
┌────────────────────────────────┐
│ Label                          │
│ ┌────────────────────────────┐ │
│ │ Selected value           ▼ │ │
│ └────────────────────────────┘ │
└────────────────────────────────┘
```

### Implementation

```tsx
<Select
  label="Region"
  value={regionId}
  onValueChange={setRegionId}
  options={regions.map(r => ({ value: r.id, label: r.name }))}
/>
```

---

## Stepper

Rarely used; mostly for "number of guests" type inputs which we don't have. Skip in MVP.

---

## Accessibility

- All form controls: associated label via `<label>` (web) or `accessibilityLabel` (RN)
- State communicated to screen readers (`aria-checked`, `aria-selected`)
- Keyboard support: Space toggles checkbox/switch; Arrow keys for radio groups; Arrow keys for sliders

## Don'ts

- ❌ Switch labels phrased as questions ("Notifications?" → use "Notifications" as a noun, On/Off is implicit)
- ❌ Checkbox where Switch fits better, or vice versa (rule of thumb: Switch = setting; Checkbox = selection)
- ❌ Radio with only 2 options (use Switch)
- ❌ Slider for discrete choices (use Tabs or Radio)
- ❌ Stepping the slider by very small amounts (annoying — pick a meaningful step)

## References

- [78-02-input.md](78-02-input.md) — for combined Form layouts
