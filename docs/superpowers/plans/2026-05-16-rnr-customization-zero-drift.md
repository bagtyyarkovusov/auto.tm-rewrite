# RNR Customization + Zero Drift — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zero drift across the mobile UI design system — every customization path has a documented rule, every file declares its source-of-truth role, and the web↔mobile boundary is announced at the top of every relevant CSS/TS/config file.

**Architecture:** Four small PRs, each independently mergeable. PR 1 (foundation) expands `docs/agents/nativewind-v4.md` with new customization sections §0.5, §7.4–7.8, §4 expansion, and §8 cross-link. PR 2 (boundaries) expands `docs/prd/ui/79-web-vs-mobile.md` and adds header banners to 5 CSS/config files. PR 3 (process) adds §Customization plan/preview requirements to the 4 command+skill files. PR 4 (proof-point) rewrites the OTP hi-fi and wireframe specs using the new vocabulary.

**Tech Stack:** Markdown docs, CSS comment headers, JS/TS docblocks. No runtime code changes. No new files (the `apps/mobile/lib/theme.ts` file doesn't exist yet per RNR §2.7 and will get its banner when RNR is adopted).

**Spec:** [2026-05-16-rnr-customization-zero-drift-design.md](../specs/2026-05-16-rnr-customization-zero-drift-design.md)

---

### Task 1: Add §0.5 (boundary rule) to nativewind-v4.md

**Files:**
- Modify: `docs/agents/nativewind-v4.md:59` (after §0.4, before `## 1 — The contract`)

- [ ] **Step 1: Insert §0.5 section**

Edit `docs/agents/nativewind-v4.md` — add after line 58 (the last line of §0.4: `- **NativeWind classes ≠ web CSS.** ...`) and before line 60 (`---\n\n## 1 — The contract`). The inserted block:

```markdown
### 0.5 — Mobile stack ≠ web stack: the boundary rule

Mobile = **NativeWind v4 + Tailwind v3 + React Native Reusables (RNR)** (`@/components/ui/*`). Web/admin = **Tailwind v4 + shadcn/ui** (`@auto-tm/ui/components`). Token **VALUES** are shared via `packages/ui/tokens/`. CSS **syntax** is NOT shared: mobile uses `@tailwind base; @tailwind components; @tailwind utilities;` (Tailwind v3), web uses `@theme inline { … }` (Tailwind v4). Components are NOT shared: RN `<Pressable>` ≠ DOM `<button>` — importing `@auto-tm/ui/components` in mobile will crash at runtime. The full matrix lives in `docs/prd/ui/79-web-vs-mobile.md`; read it for any cross-platform decision.
```

- [ ] **Step 2: Verify §-number references are resolvable**

```bash
grep -n '§0\.5' docs/agents/nativewind-v4.md
```
Expected: at least one match (the heading itself). Confirm `79-web-vs-mobile.md` exists:
```bash
test -f docs/prd/ui/79-web-vs-mobile.md && echo "EXISTS" || echo "MISSING"
```
Expected: EXISTS

- [ ] **Step 3: Commit**

```bash
git add docs/agents/nativewind-v4.md
git commit -m "docs(mobile-ui): add §0.5 web/mobile boundary rule to nativewind-v4 guide"
```

---

### Task 2: Add §4 expansion (token vs bracket utility) to nativewind-v4.md

**Files:**
- Modify: `docs/agents/nativewind-v4.md` (after the change-rules table, before the spacing scale table — after line 504)

- [ ] **Step 1: Insert token-vs-bracket rule**

The change-rules table ends at line 504: `| Change the spacing scale | Edit ... |`. New paragraph goes after that table, before `Spacing scale (4px grid):` on line 506:

```markdown
**When to add a token vs use a bracket utility:** Add a new token only if it's used in 3+ screens OR represents a brand identity moment (logo, brand-locked accent). Otherwise reach for a bracket utility: `bg-destructive/10`, `text-foreground/60`, `border-primary/40`. Bracket utilities are free, don't burden the four-file cascade, and read at the call site. Adding a token for a single-use tint is an anti-pattern — see §7.8.
```

- [ ] **Step 2: Verify insertion**

```bash
grep -n "When to add a token" docs/agents/nativewind-v4.md
```
Expected: one match at the correct line.

- [ ] **Step 3: Commit**

```bash
git add docs/agents/nativewind-v4.md
git commit -m "docs(mobile-ui): add token-vs-bracket-utility rule to §4 of nativewind-v4 guide"
```

---

### Task 3: Add §7.4 (customization decision tree) to nativewind-v4.md

**Files:**
- Modify: `docs/agents/nativewind-v4.md` (after §7.3 ending at line 1004, before `---\n\n## 8` at line 1005)

- [ ] **Step 1: Insert §7.4 section**

After `7. Run the verification gate (§9).` (line 1003) and the blank line 1004, and before `---\n\n## 8 — Anti-patterns` (line 1005), insert:

```markdown
### 7.4 Customization decision tree

Not every change to an RNR component requires a new CVA variant. Use the lightest touch that solves the problem.

```
Need a styling/behavior change vs the RNR default?
├─ One call site, one-off?                      → cn() at the call site
├─ 2 call sites, same change?                   → still cn() — extract only if it grows
├─ 3+ call sites OR brand-locked?               → Add a CVA variant to the component file (§7.6)
├─ Need a structural slot RNR lacks
│   (leading prefix, trailing button)?          → Custom composition wrapping RNR (§7.5)
├─ Visual contract of the whole primitive
│   changes for AutoTM (rare)?                  → Edit CVA BASE classes — ADR required (§7.6)
├─ Need a fork due to incompatible variant sets?
│   (the component must serve two contradictory contracts) → New sibling file — ADR required (§7.7)
└─ Primitive doesn't exist in RNR               → New file in components/ui/ via @rn-primitives or §6.9
```

Rules of thumb:
- Default to editing the RNR file in place. RNR components live in your tree; you own them.
- Prefer `cn()` over new variants — it's discoverable at the call site and doesn't grow the component's public API.
- A `className` prop on a custom composition is the primary customization API for consumers; `hasError`-style booleans are for state-driven toggling.

### 7.5 Custom composition wrapping an RNR primitive

When an RNR component doesn't have the slot you need (e.g., a leading icon or locked prefix on `Input`), wrap it in a styled container. Do NOT hand-roll a new `Pressable`+`TextInput` stack — still use the RNR primitive inside.

**File location:** `apps/mobile/components/<feature>/<Name>.tsx`. **NOT** `apps/mobile/components/ui/` — that path is reserved for RNR-installed primitives so `npx @react-native-reusables/cli@latest add` doesn't clobber your custom code.

**Rules:**
- Import the RNR primitive and use it as the core element.
- Additional chrome (prefix, suffix, divider) lives in styled `<View>` wrappers — semantic tokens only (`bg-card`, `border-input`, `border-border`).
- **Prop API includes parent-controlled booleans** (e.g., `hasError`) so the call site never ternary-classNames inline.
- Accept and merge `className` via `cn(...)`.
- For text: use the RNR `<Text>` inside the composition if it sits inside an RNR composite; raw RN `<Text>` is fine for non-contextual slots (e.g., the locked `+993` prefix).

**Worked example — `PhoneInput`:**

```tsx
// apps/mobile/components/auth/PhoneInput.tsx
import { forwardRef } from "react";
import { TextInput, type TextInputProps, View } from "react-native";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";

export interface PhoneInputProps extends TextInputProps {
  hasError?: boolean;
  prefix?: string;
}

export const PhoneInput = forwardRef<TextInput, PhoneInputProps>(
  ({ hasError, prefix = "+993", className, ...rest }, ref) => {
    return (
      <View
        className={cn(
          "h-12 flex-row items-center rounded-md bg-card",
          hasError
            ? "border-2 border-destructive"
            : "border border-input",
          className,
        )}
      >
        <View className="h-full justify-center border-r border-border px-3">
          <Text className="text-base text-foreground">{prefix}</Text>
        </View>
        <Input
          ref={ref}
          className="flex-1 border-0 bg-transparent px-3 text-base text-foreground"
          {...rest}
        />
      </View>
    );
  },
);

PhoneInput.displayName = "PhoneInput";
```

Notes on the above:
- `border-input` → `border-border` for the divider — both auto-swap in dark mode.
- `bg-card` on the wrapper, same surface as an RNR `Input`.
- `hasError` drives the border switch so the call site doesn't ternary-classNames.
- `ref` is `TextInput` — the consumer can call `.focus()` directly.
```

- [ ] **Step 2: Verify the new §7.4 and §7.5 are in place**

```bash
grep -n '### 7.4' docs/agents/nativewind-v4.md
grep -n '### 7.5' docs/agents/nativewind-v4.md
grep -c 'apps/mobile/components/auth/PhoneInput.tsx' docs/agents/nativewind-v4.md
```
Expected: 7.4 heading found; 7.5 heading found; PhoneInput.tsx appears exactly once (in the worked example).

- [ ] **Step 3: Commit**

```bash
git add docs/agents/nativewind-v4.md
git commit -m "docs(mobile-ui): add §7.4 customization decision tree + §7.5 custom composition pattern"
```

---

### Task 4: Add §7.6 (CVA variants vs base classes), §7.7 (forking), §7.8 (anti-patterns) to nativewind-v4.md

**Files:**
- Modify: `docs/agents/nativewind-v4.md` (after §7.5, before `---\n\n## 8`)

- [ ] **Step 1: Insert §7.6, §7.7, §7.8 sections**

Insert after the §7.5 worked example (end of the PhoneInput code block) and before `---\n\n## 8 — Anti-patterns`:

```markdown
### 7.6 Adding a CVA variant vs editing base classes

When a component already uses `cva()` (Class Variance Authority), you have two touch points:

**VARIANTS map** (second argument to `cva()`): visual **states** — `default | outline | brand-outline`. Add a new variant key when ≥3 screens need the same visual state. Variant keys use kebab-case: `"outline-brand"`, `"brand-locked"`.

**BASE classes** (first argument to `cva()`): apply to **all** variants of that component. Change ONLY when the change is universal across every screen — e.g., bumping `rounded-md` → `rounded-lg` for ALL buttons in the app. Universal base-class edits require an **ADR** because they affect every consumer.

**LOCKSTEP rule:** Many RNR components have TWO `cva()` calls — one for the container (`buttonVariants`), one for the text (`buttonTextVariants`). When you add a new variant key, you MUST add it to both. The anti-pattern: adding `"brand-outline"` to `buttonVariants` but skipping `buttonTextVariants` → button text renders white on a white border, invisible. The RNR Button, Badge, and Toggle have this paired-CVA pattern; check each component's file for a second `cva()` call before committing.

**Example — adding `"outline-brand"` to Button** (supersedes the §7.1 example; that section remains as a simpler intro but this is the canonical reference):

```tsx
// apps/mobile/components/ui/button.tsx
const buttonVariants = cva(
  "group flex items-center justify-center rounded-md ...",
  {
    variants: {
      variant: {
        // ... existing variants ...
        "outline-brand":
          "border-2 border-brand-500 bg-background active:bg-brand-50 dark:active:bg-brand-900/20",
      },
      size: { /* unchanged */ },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

const buttonTextVariants = cva("text-sm font-medium", {
  variants: {
    variant: {
      // ... existing text variants ...
      "outline-brand": "text-brand-500",
    },
    size: { /* unchanged */ },
  },
  defaultVariants: { variant: "default", size: "default" },
});
```

### 7.7 Forking a primitive (last resort)

**Default:** edit the RNR file in place under `components/ui/`. The RNR philosophy is "you own the file after `npx @react-native-reusables/cli add` copies it."

**Fork** to a sibling file (e.g., `components/ui/button-brand.tsx`) ONLY when:
- The semantic contract of the component diverges from RNR's default (e.g., a "BrandButton" that explicitly cannot have a `destructive` variant).
- Multiple incompatible variant sets are needed for the same primitive and one file would become a CVA megafactory with 20+ variants.

**Cost:** every `npx @react-native-reusables/cli@latest add button` upgrade now requires manual reconciliation against your fork.

**ADR REQUIRED.** No fork lands without one. The ADR must justify why in-place editing or a custom composition wouldn't suffice.

### 7.8 Anti-patterns when customizing

Do not:

- Fork a component when `cn()` at the call site would do. (§7.4, row 1)
- Add a new CSS variable / token when a bracket utility would do. (`bg-destructive/10` — see §4)
- Add a new CVA variant for a one-off used on a single screen. (use `cn()`)
- Hand-roll a `Pressable` + `TextInput` in a custom composition when the RNR primitive could be wrapped instead. (§7.5)
- Forget the `buttonVariants` / `buttonTextVariants` lockstep when adding a variant. (§7.6 LOCKSTEP rule)
- Place a custom composition inline in a route file. They belong in `components/<feature>/`. (§7.5 file location)
- Edit CVA base classes for what should be a variant. (BASE classes affect every consumer; use VARIANTS for visual states)
- Inline a hex code (`#E60000`) in a custom composition. Everything references tokens — including code you write.
```

- [ ] **Step 2: Verify all three sections are in place**

```bash
grep -n '### 7.6' docs/agents/nativewind-v4.md
grep -n '### 7.7' docs/agents/nativewind-v4.md
grep -n '### 7.8' docs/agents/nativewind-v4.md
```
Expected: all three headings found, in numerical order.

- [ ] **Step 3: Commit**

```bash
git add docs/agents/nativewind-v4.md
git commit -m "docs(mobile-ui): add §7.6 CVA variants, §7.7 forking, §7.8 anti-patterns to nativewind-v4 guide"
```

---

### Task 5: Cross-link §8 to §7.8 in nativewind-v4.md

**Files:**
- Modify: `docs/agents/nativewind-v4.md` (the §8 anti-patterns table — line 1008)

- [ ] **Step 1: Add cross-link row as first entry in the §8 table**

The §8 table starts at line 1009 with `| Anti-pattern | Why it's wrong | Do instead |`. Insert after the header row (line 1009) and separator row, before the first data row (`| import { Button } from ...`):

```markdown
| Over-customizing an RNR component (forking, unnecessary variants, one-off tokens) | See the full list at §7.8 for customization-specific anti-patterns | Follow the §7.4 decision tree — lightest touch first |
```

- [ ] **Step 2: Verify insertion**

```bash
grep -n 'Over-customizing' docs/agents/nativewind-v4.md
```
Expected: one match inside the §8 table.

- [ ] **Step 3: Commit**

```bash
git add docs/agents/nativewind-v4.md
git commit -m "docs(mobile-ui): cross-link §8 anti-patterns to §7.8 customization anti-patterns"
```

---

### Task 6: Expand docs/prd/ui/79-web-vs-mobile.md with Tailwind v3/v4 callouts and naming rule

**Files:**
- Modify: `docs/prd/ui/79-web-vs-mobile.md`

- [ ] **Step 1: Update the "What's different" section with Tailwind version callout**

The file at line 15 currently says `| Component implementations | React DOM + Tailwind | React Native + NativeWind | Different rendering primitives |`. Replace that row with an expanded one, and add a new row for CSS syntax:

Replace line 15:
```
| Component implementations | React DOM + Tailwind | React Native + NativeWind | Different rendering primitives |
```

With:
```
| Component implementations | React DOM + shadcn/ui (`@auto-tm/ui/components`) | React Native + React Native Reusables (`apps/mobile/components/ui/`) | Different rendering primitives — web uses HTML elements, mobile uses RN Pressable/View |
| CSS syntax | Tailwind v4 (`@theme inline { … }` in `globals.css`) | Tailwind v3 (`@tailwind base; @tailwind components; @tailwind utilities;` in `global.css`) | NativeWind v4 + Metro only understand Tailwind v3. Copying v4 `@theme` blocks into mobile `global.css` breaks the build |
```

- [ ] **Step 2: Add naming rule section after the decision tree**

After line 94 (end of the decision tree code block `\`\`\``), before `## References` on line 96, insert:

```markdown
## Token naming rule: which class to reach for

When styling a mobile screen, pick the right layer first:

```
Building app chrome (background, card, text, border, button bg)?
  → SEMANTIC name: bg-background, bg-card, text-foreground, border-border,
                   bg-primary, bg-destructive, bg-muted
Status hue that should look identical in both modes (success/warning/error/info)?
  → STATUS hue: text-success-500, bg-warning-500/10, text-error-500, text-info-500
Brand identity moment (logo, brand-locked accent, special CTA tint)?
  → RAW BRAND: bg-brand-500, text-brand-700
Variant-driven (CVA inside an RNR component)?
  → Lives inside that component file under variants
```

**`destructive` vs `error-500` is intentional, not a duplicate.** `bg-destructive` = destructive ACTION semantic (`Button variant="destructive"` — auto-swaps with theme). `text-error-500` = error STATE status (inline validation message — locked hue, identical in both modes). The decision tree above tells you which to use; don't pick at random.
```

- [ ] **Step 3: Verify**

```bash
grep -n "Tailwind v3" docs/prd/ui/79-web-vs-mobile.md
grep -n "Token naming rule" docs/prd/ui/79-web-vs-mobile.md
```
Expected: Tailwind v3 appears in the new table row; "Token naming rule" heading found.

- [ ] **Step 4: Commit**

```bash
git add docs/prd/ui/79-web-vs-mobile.md
git commit -m "docs(ui): add Tailwind v3/v4 boundary + token naming rule to 79-web-vs-mobile"
```

---

### Task 7: Add header banners to mobile CSS and config files

**Files:**
- Modify: `apps/mobile/global.css` (prepend banner)
- Modify: `apps/mobile/tailwind.config.js` (prepend docblock)

Note: `apps/mobile/lib/theme.ts` does not exist yet (RNR setup §2.7 hasn't run). The banner will be added when that file is created during RNR adoption. No action needed in this PR.

- [ ] **Step 1: Prepend banner to `apps/mobile/global.css`**

Current line 1 is `@tailwind base;`. Insert BEFORE it:

```css
/* AutoTM mobile CSS variables — Tailwind v3 + NativeWind v4
 * AUTHORITY: This file + apps/mobile/lib/theme.ts are PRIMARY for mobile
 * semantic tokens (--background, --primary, etc.). HSL values mirror
 * lib/theme.ts exactly and derive from packages/ui/tokens/colors.ts.
 * DO NOT copy from apps/web/src/app/[locale]/globals.css or packages/ui/theme/theme.css
 * — those use Tailwind v4 @theme syntax which breaks Metro on mobile.
 * Rules: docs/agents/nativewind-v4.md §0.5, §2, §4.
 */
```

- [ ] **Step 2: Verify banner is first content in the file**

```bash
head -1 apps/mobile/global.css
```
Expected: `/* AutoTM mobile CSS variables — Tailwind v3 + NativeWind v4`

- [ ] **Step 3: Prepend docblock to `apps/mobile/tailwind.config.js`**

Current line 1 is `const { tailwindTheme } = require(...);`. Insert BEFORE it:

```js
/**
 * AutoTM mobile Tailwind config — v3 + NativeWind v4 preset.
 * Extends @auto-tm/ui/theme/tailwind with shadcn-style semantic colors
 * resolving via CSS vars from global.css. Locked to v3 due to NativeWind +
 * Metro constraints. Web/admin use v4 in a different config shape.
 * Rules: docs/agents/nativewind-v4.md §0.5, §2.5.
 */
```

- [ ] **Step 4: Verify**

```bash
head -1 apps/mobile/tailwind.config.js
```
Expected: `/**`

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/global.css apps/mobile/tailwind.config.js
git commit -m "docs(mobile): add boundary banners to global.css and tailwind.config.js"
```

---

### Task 8: Add header banners to web/admin CSS files and packages/ui/theme/theme.css

**Files:**
- Modify: `apps/web/src/app/[locale]/globals.css` (prepend banner)
- Modify: `apps/admin/src/app/globals.css` (prepend banner)
- Modify: `packages/ui/theme/theme.css` (prepend banner)

- [ ] **Step 1: Prepend banner to `apps/web/src/app/[locale]/globals.css`**

Current line 1 is `@import "tailwindcss";`. Insert BEFORE it:

```css
/* AutoTM public web CSS — Tailwind v4 (@theme inline syntax).
 * Web/admin use Tailwind v4 + shadcn/ui (@auto-tm/ui/components).
 * Mobile uses Tailwind v3 + NativeWind v4 + RNR — DO NOT copy this
 * syntax to apps/mobile/global.css. The @theme directive does not exist
 * in v3 and Metro will fail at build time.
 * Boundary rules: docs/prd/ui/79-web-vs-mobile.md.
 */
```

- [ ] **Step 2: Prepend banner to `apps/admin/src/app/globals.css`**

Same content as web CSS, but with "admin web" context:

```css
/* AutoTM admin web CSS — Tailwind v4 (@theme inline syntax).
 * Web/admin use Tailwind v4 + shadcn/ui (@auto-tm/ui/components).
 * Mobile uses Tailwind v3 + NativeWind v4 + RNR — DO NOT copy this
 * syntax to apps/mobile/global.css. The @theme directive does not exist
 * in v3 and Metro will fail at build time.
 * Boundary rules: docs/prd/ui/79-web-vs-mobile.md.
 */
```

- [ ] **Step 3: Prepend banner to `packages/ui/theme/theme.css`**

Current line 1 is `@import "tailwindcss";`. Insert BEFORE it:

```css
/* AutoTM shared theme CSS — Tailwind v4 ONLY.
 * Consumed by apps/web/src/app/[locale]/globals.css and apps/admin/src/app/globals.css.
 * The @theme blocks are Tailwind v4 syntax — NEVER import this file into
 * apps/mobile (Tailwind v3). Mobile defines its own CSS vars in
 * apps/mobile/global.css. Token VALUES on both sides derive from
 * packages/ui/tokens/colors.ts.
 * Boundary rules: docs/prd/ui/79-web-vs-mobile.md.
 */
```

- [ ] **Step 4: Verify banners on all three files**

```bash
head -1 apps/web/src/app/[locale]/globals.css
head -1 apps/admin/src/app/globals.css
head -1 packages/ui/theme/theme.css
```
Expected: all three start with `/* AutoTM ... CSS — Tailwind v4`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/[locale]/globals.css apps/admin/src/app/globals.css packages/ui/theme/theme.css
git commit -m "docs(ui): add Tailwind v4 boundary banners to web, admin, and shared theme CSS"
```

---

### Task 9: Update wireframe commands + skills with Customization preview requirement

**Files:**
- Modify: `.claude/commands/wireframe.md`
- Modify: `.agents/skills/wireframe-agent-skill/SKILL.md`

Both files get identical edits.

- [ ] **Step 1: Add new "Read first" entry to both files**

Find `§1. Read these first` section. After the existing list items, add:

```
6. **`docs/agents/nativewind-v4.md` §7.4 (decision tree), §7.5 (custom compositions), §7.6 (CVA variants), §7.8 (anti-patterns)** — know the customization paths before naming primitives.
```

For `.claude/commands/wireframe.md` this is line ~41 (after `5. docs/prd/flows/...`).
For `.agents/skills/wireframe-agent-skill/SKILL.md` this is line ~40 (after `5. docs/prd/flows/...`).

- [ ] **Step 2: Add hard rule to both files**

In `§0. Hard rules`, add after the existing first bullet:

```
- **Read `docs/agents/nativewind-v4.md` §0.5 (web/mobile boundary) before any mobile output. Read §7.4–7.8 (customization paths) before specifying any non-default RNR usage.**
```

- [ ] **Step 3: Add §Customization preview as an optional output subsection in `§4.1 Output structure` template**

After the `## Numbered content blocks` section in the template (before `## Interactions`), insert:

```
## Customization preview (mobile-only; skip if all primitives use defaults)

- <Primitive name> — <one-liner: "needs leading-slot composition" / "needs brand-outline variant" / "needs hidden-input composition for OTP cells">
- ...
```

For `.claude/commands/wireframe.md` this goes after line ~170 (`...`) and before line 172 (`## Interactions`).
For the skill file, same relative position.

- [ ] **Step 4: Add self-check item**

In the self-check list at `§5` (or `§6` in the skill), add:

```
- [ ] **Mobile wireframes only:** If any primitive named won't fit a stock RNR variant, surface it in §Customization preview.
```

- [ ] **Step 5: Add bail condition**

In the bail conditions section, add:

```
- **Stop if customization needs a fork but no ADR exists.** Suggest `/new-adr` first.
```

- [ ] **Step 6: Verify parallel edits**

```bash
diff -u <(sed -n '/Customization preview/,+5p' .claude/commands/wireframe.md) \
        <(sed -n '/Customization preview/,+5p' .agents/skills/wireframe-agent-skill/SKILL.md)
```
Expected: near-zero diff (frontmatter aside, the custom block is identical).

- [ ] **Step 7: Commit**

```bash
git add .claude/commands/wireframe.md .agents/skills/wireframe-agent-skill/SKILL.md
git commit -m "docs(skills): require Customization preview in mobile wireframes"
```

---

### Task 10: Update hifi-design commands + skills with Customization plan requirement

**Files:**
- Modify: `.claude/commands/hifi-design.md`
- Modify: `.agents/skills/hifi-design-agent-skill/SKILL.md`

Both files get identical edits.

- [ ] **Step 1: Add new "Read first" entry to both files**

Same as Task 9 Step 1 — add to `§1. Read these first`:

```
5. **`docs/agents/nativewind-v4.md` §7.4 (decision tree), §7.5 (custom compositions), §7.6 (CVA variants), §7.7 (forking), §7.8 (anti-patterns)** — know every customization path before specifying non-default RNR usage.
```

- [ ] **Step 2: Add hard rule to both files**

In `§0. Hard rules`, add:

```
- **Read `docs/agents/nativewind-v4.md` §0.5 (web/mobile boundary) before any mobile output. Read §7.4–7.8 (customization paths) before specifying any non-default RNR usage.**
```

- [ ] **Step 3: Add §Customization plan as a REQUIRED output section in `§4.1 Output structure` template**

Insert between "Component shape" and "States" in the output template:

```
## Customization plan

For each non-default RNR usage, list:
- Primitive: <RNR component or "new primitive">
- Path (per nativewind-v4.md §7.4): <cn at call site | new CVA variant | custom composition wrapping RNR | base-class edit | fork | new primitive>
- File: <apps/mobile/components/ui/<file>.tsx for variant edits
       | apps/mobile/components/<feature>/<Name>.tsx for compositions
       | docs/adr/<NN>-<slug>.md for forks (ADR required)>
- For variants: name + paired CVA edits (variants + textVariants if applicable)
- For compositions: prop API summary + ~30-line shape
- For forks: ADR reference + rationale

If nothing needs customization, write: "None — all RNR primitives used at defaults."
```

For `.claude/commands/hifi-design.md` this goes after line ~315 (`Show the component skeleton...`) and before line 317 (`## States`).
For the skill file, same relative position.

- [ ] **Step 4: Add self-check items**

In the self-check list at `§4.2` (or equivalent), add:

```
- [ ] **Mobile specs only:** If any RNR primitive uses a non-default variant OR is wrapped in a custom composition OR is forked, the §Customization plan lists each with path + file.
- [ ] **Mobile specs only:** Custom compositions live under `apps/mobile/components/<feature>/`, NOT `apps/mobile/components/ui/` (that path is reserved for RNR-installed primitives).
- [ ] **Mobile specs only:** Paired CVAs (e.g., `buttonVariants` + `buttonTextVariants`) are edited in lockstep.
```

- [ ] **Step 5: Add bail condition**

In the bail conditions at `§6` (or equivalent):

```
- **Stop if customization needs a fork but no ADR exists.** Suggest `/new-adr` first.
```

- [ ] **Step 6: Verify parallel edits**

```bash
diff -u <(sed -n '/Customization plan/,+12p' .claude/commands/hifi-design.md) \
        <(sed -n '/Customization plan/,+12p' .agents/skills/hifi-design-agent-skill/SKILL.md)
```
Expected: near-zero diff.

- [ ] **Step 7: Commit**

```bash
git add .claude/commands/hifi-design.md .agents/skills/hifi-design-agent-skill/SKILL.md
git commit -m "docs(skills): require Customization plan in hifi-design specs"
```

---

### Task 11: Add §Customization preview to OTP wireframe doc

**Files:**
- Modify: `docs/prd/ui/wireframes/mobile-otp-login-flow.md`

- [ ] **Step 1: Add customization preview to "Phone entry" wireframe section**

After the "Interactions" block in the Phone entry section (~line 135, after the last interaction line), before "## States", insert:

```
## Customization preview

- **Phone input** — needs `PhoneInput` composition (leading `+993` slot over RNR `Input`)
```

- [ ] **Step 2: Add customization preview to "OTP entry" wireframe section**

After the "Interactions" block in the OTP entry section (~line 219, after the last interaction line), before "## States", insert:

```
## Customization preview

- **OTP input** — needs `OtpCells` composition (6 visual cells over hidden `TextInput`, owns shake animation)
```

- [ ] **Step 3: Verify**

```bash
grep -n "Customization preview" docs/prd/ui/wireframes/mobile-otp-login-flow.md
```
Expected: two matches.

- [ ] **Step 4: Commit**

```bash
git add docs/prd/ui/wireframes/mobile-otp-login-flow.md
git commit -m "docs(ui): add Customization preview to OTP wireframe (PhoneInput + OtpCells)"
```

---

### Task 12: Rewrite OTP hi-fi spec — Implementation status note + Token map header

**Files:**
- Modify: `docs/prd/ui/hifi/mobile-otp-login-flow.md`

- [ ] **Step 1: Rewrite the Implementation status note (lines 22–30)**

Replace the existing Implementation status note block with:

```markdown
## Implementation status note

The S2 OTP screens at `apps/mobile/app/(auth)/phone.tsx` and `apps/mobile/app/(auth)/otp.tsx` ship using raw React Native primitives (`<Pressable>`, `<TextInput>`, `<View>`) plus NativeWind. That was correct for S2 because RNR was not yet adopted.

**Post-RNR migration plan** (6 steps, per `docs/agents/nativewind-v4.md` §7.3):

1. Install RNR components: `pnpm --filter @auto-tm/mobile exec npx @react-native-reusables/cli@latest add button input icon text sheet badge` (one-time; follow `docs/agents/nativewind-v4.md` §2).
2. Add `PhoneInput` custom composition per §Customization plan below — replaces the hand-rolled `+993` prefix + `TextInput` stack.
3. Add `OtpCells` custom composition per §Customization plan below — replaces the inline 6-cell `View` + hidden `TextInput` + `Animated.Value`.
4. Swap every raw palette class for a semantic token:
   - `bg-neutral-0 dark:bg-neutral-950` → `bg-background`
   - `text-neutral-900 dark:text-neutral-50` → `text-foreground`
   - `text-neutral-600 dark:text-neutral-300` → `text-muted-foreground`
   - `border-neutral-200 dark:border-neutral-700` → `border-border`
   - `border-error-500` → `border-destructive`
   - `border-brand-500` → `border-primary`
   - `bg-neutral-0 dark:bg-neutral-900` (in inputs/cells) → `bg-card`
   - `bg-neutral-50 dark:bg-neutral-900` (in OTP cells) → `bg-muted`
5. Drop imperative `palette.neutral[…]` icon color resolution. Use `<Icon as={X|ChevronLeft} className="size-5 text-foreground">`.
6. Run `docs/agents/nativewind-v4.md` §9 verification gate.

Token shapes shown in this spec are the **target post-migration state**.
```

- [ ] **Step 2: Add token-name rule line at the top of §Token map**

Find `## Token map` heading. Add immediately after it, before the first subsection:

```markdown
Token-name choice rule per `docs/agents/nativewind-v4.md` §3 decision tree and `docs/prd/ui/79-web-vs-mobile.md` §Naming. Below is the resolved token map for this screen.
```

- [ ] **Step 3: Verify**

```bash
grep -n "Post-RNR migration plan" docs/prd/ui/hifi/mobile-otp-login-flow.md
grep -n "Token-name choice rule" docs/prd/ui/hifi/mobile-otp-login-flow.md
```
Expected: both found.

- [ ] **Step 4: Commit**

```bash
git add docs/prd/ui/hifi/mobile-otp-login-flow.md
git commit -m "docs(ui): rewrite OTP hi-fi implementation status note and add token naming rule"
```

---

### Task 13: Rewrite OTP hi-fi spec — Component shape (route skeletons using compositions)

**Files:**
- Modify: `docs/prd/ui/hifi/mobile-otp-login-flow.md` (the §Component shape section)

- [ ] **Step 1: Replace the phone route skeleton**

Find the phone route code block (starts around line 182 with `import { KeyboardAvoidingView ...`). Replace the `View` wrapper that currently contains the hand-rolled phone input (lines 216–241, the `+993` prefix + `TextInput` stack) with the `PhoneInput` composition import + usage.

The phone route skeleton becomes:

```tsx
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { PhoneInput } from "@/components/auth/PhoneInput";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

<KeyboardAvoidingView
  behavior={Platform.OS === "ios" ? "padding" : undefined}
  className="flex-1 bg-background"
>
  <SafeAreaView className="flex-1 px-4">
    <View className="flex-row items-center justify-between py-4">
      <Button variant="ghost" size="icon" onPress={closeAuth} accessibilityLabel={t("auth.close")}>
        <Icon as={X} className="size-5 text-foreground" />
      </Button>
      <LocaleSwitcher value={locale} onChange={setLocale} />
    </View>

    <View className="mt-8 gap-8">
      <BrandLogo className="h-10 self-start" />

      <View className="gap-2">
        <Text className="text-2xl font-semibold leading-snug text-foreground">
          {t("auth.phone.title")}
        </Text>
        <Text className="text-base leading-normal text-muted-foreground">
          {t("auth.phone.helper")}
        </Text>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-medium text-foreground">
          {t("auth.phone.label")}
        </Text>
        <PhoneInput
          hasError={hasError}
          value={phoneDisplay}
          onChangeText={handlePhoneChange}
          placeholder={t("auth.phone.placeholder")}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          accessibilityLabel={t("auth.phone.label")}
        />
        <Text className={hasError ? "text-sm leading-snug text-destructive" : "text-sm leading-snug text-muted-foreground"}>
          {helperText}
        </Text>
      </View>

      <Button
        variant="default"
        size="lg"
        disabled={!canSubmit}
        onPress={handleSubmit}
        accessibilityState={{ disabled: !canSubmit }}
      >
        <Text>{t("auth.phone.getCode")}</Text>
      </Button>
    </View>

    <Text className="mt-auto pb-6 text-xs leading-normal text-muted-foreground">
      {t("auth.legal.prefix")}{" "}
      <Text
        className="font-medium text-info-500 underline"
        onPress={() => openLegalPage("terms")}
        accessibilityRole="link"
      >
        {t("auth.legal.terms")}
      </Text>{" "}
      {t("auth.legal.and")}{" "}
      <Text
        className="font-medium text-info-500 underline"
        onPress={() => openLegalPage("privacy")}
        accessibilityRole="link"
      >
        {t("auth.legal.privacy")}
      </Text>
      .
    </Text>
  </SafeAreaView>
</KeyboardAvoidingView>
```

- [ ] **Step 2: Replace the OTP route skeleton**

Find the OTP route code block (starts around line 280). Replace the `Animated.View` with 6 cells + hidden `TextInput` (lines ~321–351) with the `OtpCells` composition. Also replace the ChevronLeft + X `Pressable` buttons with RNR `Button variant="ghost"` + `Icon`.

The key fragment becomes:

```tsx
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, X } from "lucide-react-native";
import { OtpCells, type OtpCellsHandle } from "@/components/auth/OtpCells";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

const otpRef = useRef<OtpCellsHandle>(null);

// On wrong code:
// otpRef.current?.shake();

<KeyboardAvoidingView
  behavior={Platform.OS === "ios" ? "padding" : undefined}
  className="flex-1 bg-background"
>
  <SafeAreaView className="flex-1 px-4">
    <View className="flex-row items-center justify-between py-4">
      <View className="flex-row gap-2">
        <Button variant="ghost" size="icon" onPress={backToPhone} accessibilityLabel={t("auth.backToPhone")}>
          <Icon as={ChevronLeft} className="size-5 text-foreground" />
        </Button>
        <Button variant="ghost" size="icon" onPress={closeAuth} accessibilityLabel={t("auth.close")}>
          <Icon as={X} className="size-5 text-foreground" />
        </Button>
      </View>
      <LocaleSwitcher value={locale} onChange={setLocale} />
    </View>

    <View className="mt-8 gap-8">
      <BrandLogo className="h-10 self-start" />

      <View className="gap-2">
        <Text className="text-2xl font-semibold leading-snug text-foreground">
          {t("auth.otp.title")}
        </Text>
        <Text className="text-base leading-normal text-muted-foreground">
          {t("auth.otp.sent", { phone: maskedPhone })}
        </Text>
        <Button variant="link" size="sm" onPress={backToPhone} className="self-start px-0">
          <Text className="text-sm font-medium text-info-500">{t("auth.otp.changeNumber")}</Text>
        </Button>
      </View>

      <OtpCells ref={otpRef} value={code} onChange={setCode} hasError={!!otpError} />

      {otpError ? (
        <Text className="text-sm leading-snug text-destructive">{otpError}</Text>
      ) : null}

      <Button
        variant="link"
        size="sm"
        onPress={resendCode}
        disabled={secondsRemaining > 0 || isResending}
        className="self-start px-0"
      >
        <Text className={secondsRemaining > 0 ? "text-sm font-medium text-muted-foreground" : "text-sm font-medium text-info-500"}>
          {secondsRemaining > 0 ? t("auth.otp.resendIn", { seconds: secondsRemaining }) : t("auth.otp.resend")}
        </Text>
      </Button>

      {isDev && testCode ? (
        <Badge variant="secondary" className="self-start">
          <Text className="text-sm font-medium text-foreground">
            {t("auth.otp.devCode", { code: testCode })}
          </Text>
        </Badge>
      ) : null}
    </View>
  </SafeAreaView>
</KeyboardAvoidingView>
```

- [ ] **Step 3: Update the notes below the code blocks**

Replace the existing "Notes:" block below the OTP route with:

```markdown
Notes:
- RNR imports listed above: `button`, `input`, `icon`, `text`, `sheet`, `badge` — installed via RNR CLI. `sheet` requires `PortalHost` in root layout.
- `PhoneInput` and `OtpCells` are custom compositions (see §Customization plan). Phone route is now ~15 lines shorter; OTP route is ~30 lines shorter.
- `OtpCells` owns the hidden `TextInput`, the 6 visual cells, and the shake animation via `useImperativeHandle`. The route file calls `otpRef.current?.shake()` on wrong code and never instantiates an `Animated.Value`.
- `Button variant="link"` used for "Change number" and "Resend code" with `className="self-start px-0"` to disable centered padding. This is a `cn()` override (per §7.4 row 1), not a new CVA variant — only 2 call sites.
- `BrandLogo` remains a local component wrapping `apps/mobile/assets/logos_color_red.svg`. Not an RNR customization — no §Customization plan entry.
```

- [ ] **Step 4: Verify**

```bash
grep -c "PhoneInput" docs/prd/ui/hifi/mobile-otp-login-flow.md
grep -c "OtpCells" docs/prd/ui/hifi/mobile-otp-login-flow.md
grep -c "otpRef.current?.shake()" docs/prd/ui/hifi/mobile-otp-login-flow.md
```
Expected: PhoneInput ≥ 2, OtpCells ≥ 3, shake reference found.

- [ ] **Step 5: Commit**

```bash
git add docs/prd/ui/hifi/mobile-otp-login-flow.md
git commit -m "docs(ui): rewrite OTP hi-fi component shape using PhoneInput + OtpCells compositions"
```

---

### Task 14: Add §Customization plan section to OTP hi-fi spec

**Files:**
- Modify: `docs/prd/ui/hifi/mobile-otp-login-flow.md` (after §Component shape, before §States)

- [ ] **Step 1: Insert §Customization plan section**

After the Component shape code blocks and Notes, before `## States`, insert:

```markdown
## Customization plan

### A. PhoneInput — custom composition wrapping RNR `Input`

- **Path** (per `docs/agents/nativewind-v4.md` §7.5): custom composition
- **File:** `apps/mobile/components/auth/PhoneInput.tsx`
- **Why:** RNR `Input` ships without a leading-slot API. We need a locked `+993` prefix with a `border-r border-border` divider, plus error-state border switching.
- **Prop API:**
  - `hasError?: boolean` — drives `border-destructive` vs `border-input`
  - `prefix?: string` — defaults to `"+993"`
  - All native `TextInput` props via spread (value, onChangeText, placeholder, keyboardType, etc.)
  - `className?: string` — merged via `cn()`
  - `forwardRef<TextInput>` — caller can `.focus()` the underlying input
- **Shape (~30 lines):** The full worked example is in `docs/agents/nativewind-v4.md` §7.5. In brief: wrapper `<View>` with `bg-card` + conditional border; locked-prefix `<View>` with `border-r border-border` + RNR `<Text>`; RNR `<Input>` with `border-0 bg-transparent` filling the remaining space.

### B. OtpCells — custom composition wrapping a hidden RN `TextInput`

- **Path** (per `docs/agents/nativewind-v4.md` §7.5): custom composition (uses raw RN `<TextInput>` because the hidden-input-over-visual-cells pattern doesn't fit RNR `Input`'s className-merging assumptions)
- **File:** `apps/mobile/components/auth/OtpCells.tsx`
- **Why:** 6 visual cells sit over one invisible numeric `<TextInput>` that owns focus, paste, SMS autofill, and accessibility. The composition also owns the shake `Animated.Value` so route files don't declare animation state.
- **Prop API:**
  - `value: string` — current digit string (0–6 chars)
  - `onChange: (value: string) => void` — sanitized digit-only callback (max 6)
  - `hasError?: boolean` — all cells render `border-destructive`
  - `length?: number` — defaults to 6
- **Imperative handle** (`useImperativeHandle`):
  - `focus(): void` — focuses the hidden input
  - `shake(): void` — plays the 4-step horizontal shake animation, then clears
- **Cell states** (per-cell, derived from `value`, `hasError`, and focused index):
  - Empty, not focused: `border border-border bg-muted`
  - Filled: `border border-primary bg-card`
  - Focused (next empty cell): `border-2 border-primary bg-card`
  - Error: `border-2 border-destructive bg-card`
- **Shape (~50 lines):** `Animated.View` wrapping 6 `<View>` cells + one absolutely-positioned transparent `<TextInput>`. Each cell contains `<Text className="font-mono text-2xl font-semibold leading-tight text-foreground">{digit ?? ""}</Text>`. The `Animated.Value` is internal to the component; `shake()` triggers the sequence and resets to 0.

### C. Button "link" inline pattern — `cn()` override at call site

- **Path** (per §7.4 row 1): `cn()` at the call site
- **Used for:** "Change number" and "Resend code" on the OTP screen; "Terms" and "Privacy" on the phone screen.
- **Pattern:** `<Button variant="link" className="self-start px-0">` — `self-start` left-aligns; `px-0` removes Button's default horizontal padding so the link hugs its content.
- **No new variant needed.** With only 2 current call sites, a new CVA variant is premature. Promote to a variant if a third screen needs the same link pattern.
```

- [ ] **Step 2: Verify section placement**

```bash
grep -n "## Customization plan" docs/prd/ui/hifi/mobile-otp-login-flow.md
grep -n "## States" docs/prd/ui/hifi/mobile-otp-login-flow.md
```
Expected: Customization plan heading before States heading.

- [ ] **Step 3: Commit**

```bash
git add docs/prd/ui/hifi/mobile-otp-login-flow.md
git commit -m "docs(ui): add Customization plan to OTP hi-fi (PhoneInput + OtpCells + link pattern)"
```

---

### Task 15: Expand OTP hi-fi self-check and run final section-number integrity check

**Files:**
- Modify: `docs/prd/ui/hifi/mobile-otp-login-flow.md` (the §Self-check list at end)
- Verify: all 12 files in the spec's §6 static checks

- [ ] **Step 1: Add new self-check items to the OTP hi-fi**

Find the `## Self-check` section near the bottom. Append to the bullet list:

```markdown
- §Customization plan section present — lists PhoneInput (custom composition) + OtpCells (custom composition) + Button "link" inline pattern (cn() override).
- Custom compositions live under `apps/mobile/components/auth/`, NOT `apps/mobile/components/ui/` (that path is reserved for RNR-installed primitives).
- `OtpCells` owns the shake animation via `useImperativeHandle`; route file does NOT redeclare an `Animated.Value`.
- Button "link" inline pattern uses `cn()` at call site, not a new CVA variant (justification: 2 call sites — promote only when third screen needs it).
```

- [ ] **Step 2: Run section-number integrity check**

```bash
grep -noE '§[0-9]+(\.[0-9]+)*' \
  docs/agents/nativewind-v4.md \
  docs/prd/ui/79-web-vs-mobile.md \
  docs/prd/ui/hifi/mobile-otp-login-flow.md \
  docs/prd/ui/wireframes/mobile-otp-login-flow.md \
  .claude/commands/wireframe.md \
  .claude/commands/hifi-design.md \
  .agents/skills/wireframe-agent-skill/SKILL.md \
  .agents/skills/hifi-design-agent-skill/SKILL.md \
  | sort -t: -k2 | uniq
```

Walk through each reference and confirm:
- `§0.5` → exists in nativewind-v4.md ✓ (added in Task 1)
- `§7.4`–`§7.8` → exist in nativewind-v4.md ✓ (added in Tasks 3–4)
- `§2`, `§2.5`, `§4` → pre-existing in nativewind-v4.md
- `§6.7`, `§6.9` → pre-existing in nativewind-v4.md
- `§3`, `§7.3`, `§8`, `§9` → pre-existing in nativewind-v4.md
- `docs/prd/ui/79-web-vs-mobile.md` → file exists

If any reference names a section that doesn't exist in its target file, abort and fix.

- [ ] **Step 3: Verify no new hex values introduced**

```bash
grep -nE '#[0-9a-fA-F]{3,8}' docs/agents/nativewind-v4.md
```
Expected: returns only the pre-existing entries (the BrandLogo hex references in worked examples — these are cited, not newly introduced). If a new bare hex appears in a §7 customization rule, replace it with a token reference.

- [ ] **Step 4: Commit**

```bash
git add docs/prd/ui/hifi/mobile-otp-login-flow.md
git commit -m "docs(ui): expand OTP hi-fi self-check and run section-number integrity verification"
```

---

### Task 16: Banner verification — confirm all banner-bearing files

**Files:** No edits — verification only.

- [ ] **Step 1: Confirm every file in the §3 banner spec has its banner**

```bash
echo "=== Mobile ===" && head -1 apps/mobile/global.css apps/mobile/tailwind.config.js
echo "=== Web/Admin ===" && head -1 apps/web/src/app/[locale]/globals.css apps/admin/src/app/globals.css
echo "=== Shared ===" && head -1 packages/ui/theme/theme.css
```

Expected: all five files start with a `/* AutoTM ...` comment banner (mobile, web, admin) or docblock (`/**` for tailwind.config.js).

- [ ] **Step 2: Confirm `apps/mobile/lib/theme.ts` is correctly absent**

```bash
test -f apps/mobile/lib/theme.ts && echo "EXISTS — add banner now" || echo "NOT FOUND — will be created with banner during RNR adoption (guide §2.7)"
```
Expected: NOT FOUND.

- [ ] **Step 3: Final diff overview**

```bash
git diff --stat HEAD~15..HEAD 2>/dev/null || git diff --stat main..HEAD 2>/dev/null || echo "(check individual commits)"
```

Walk the file list against the spec's "Files touched" table (§1). Every file in the table should appear in the diff. Every file in the diff should appear in the table (or be in the "intentionally not touched" list).

- [ ] **Step 4: No commit — verification only**

---

## Self-Review

**1. Spec coverage:**
- §1 (file inventory): Task 16 verifies all 13 files touched
- §2 (nativewind-v4.md expansion): Tasks 1–5
- §3 (per-file banners): Tasks 7–8 (Task 16 verifies)
- §4 (skill + command updates): Tasks 9–10
- §5 (OTP hi-fi rewrite): Tasks 11–14
- §6 (verification): Task 15 Step 2 (section-number integrity), Task 16 (banner presence)

**2. Placeholder scan:** No TBD, TODO, "implement later", "add error handling", or "similar to Task N". Every step has exact code and commands.

**3. Type consistency:** Section numbers (§0.5, §7.4–7.8) consistent across all tasks. File paths match the spec's inventory. PhoneInput → `apps/mobile/components/auth/PhoneInput.tsx` in all tasks. OtpCells → `apps/mobile/components/auth/OtpCells.tsx` in all tasks.

---

Plan complete and saved to `docs/superpowers/plans/2026-05-16-rnr-customization-zero-drift.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
