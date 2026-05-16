# Mobile UI: RNR Customization + Zero Drift

Date: 2026-05-16
Owner: Mobile UI workstream
Status: Design approved, ready for `writing-plans`

## Problem

The mobile UI stack (NativeWind v4 + React Native Reusables / RNR) is already documented in `docs/agents/nativewind-v4.md`. But three classes of drift make AI agents pick the wrong source and produce inconsistent code:

1. **RNR customization paths are under-documented.** `nativewind-v4.md` §7.1 shows ONE customization example (adding a CVA variant). It doesn't cover: `cn()` call-site overrides, custom compositions wrapping an RNR primitive (which the OTP hi-fi already needs for the `+993` prefix), editing CVA base classes vs. variants, forking a primitive, the `buttonVariants`/`buttonTextVariants` lockstep rule, or anti-patterns when over-customizing.

2. **Web ↔ mobile boundary leaks silently.** `apps/web/[locale]/globals.css`, `apps/admin/globals.css`, and `packages/ui/theme/theme.css` all use Tailwind v4 (`@theme inline` syntax). `apps/mobile/global.css` is locked to v3. None of these files has a header banner. An agent copying syntax across the boundary breaks Metro at build time. Component imports also silently fail (`@auto-tm/ui/components` is HTML-element-based — would crash at runtime on RN — but the rule lives only in one anti-pattern bullet inside §8).

3. **The live OTP screens contradict the hi-fi spec.** `apps/mobile/app/(auth)/phone.tsx` and `apps/mobile/app/(auth)/otp.tsx` use raw palette classes (`bg-neutral-0 dark:bg-neutral-950`, `border-error-500`, `border-brand-500`) and resolve icon colors imperatively via `palette.neutral[…]`. The hi-fi spec specifies the post-RNR target shape but only mentions the migration in lines 22–30, easy to miss.

A drift audit (subagent, 2026-05-16) confirmed all VALUES at source (hex codes in `packages/ui/tokens/`) are correct. The drift is in NAMING, NAVIGATION (which file is the source of truth), and the WEB ↔ MOBILE BOUNDARY.

## Goal

**Zero drift** for any AI agent working on mobile UI: every customization decision has exactly one path; every file declares its source-of-truth role; the web↔mobile boundary is announced at the top of every relevant file.

## Approach

**Inline + banners.** No new docs. Existing files are expanded with sections and headers; the four skill/command files (`.claude/commands/` + `.agents/skills/`) get a new requirement that forces hi-fi specs to surface customizations explicitly. The OTP hi-fi spec is the proof-point.

## Files touched

| File | Role after this work | Edit type |
|---|---|---|
| `docs/agents/nativewind-v4.md` | Authoritative for mobile UI. Adds §0.5 (boundary), §7.4–7.8 (customization), §4 expansion (token vs bracket), §8 cross-link | Major addition |
| `docs/prd/ui/79-web-vs-mobile.md` | Authoritative for web↔mobile split. Explicit v3/v4 + RNR/shadcn callouts + naming rule | Expansion |
| `.claude/commands/wireframe.md` | Mobile wireframes surface customization needs | Add §Customization preview |
| `.claude/commands/hifi-design.md` | Mobile hi-fi specs include §Customization plan | Add §Customization plan |
| `.agents/skills/wireframe-agent-skill/SKILL.md` | Mirror of wireframe.md | Mirror change |
| `.agents/skills/hifi-design-agent-skill/SKILL.md` | Mirror of hifi-design.md | Mirror change |
| `docs/prd/ui/hifi/mobile-otp-login-flow.md` | OTP hi-fi using the new vocabulary | Rewrite §Component shape + add §Customization plan |
| `docs/prd/ui/wireframes/mobile-otp-login-flow.md` | OTP wireframe with §Customization preview | Add §Customization preview |
| `apps/mobile/global.css` | Mobile CSS var layer (v3) | Header banner |
| `apps/mobile/lib/theme.ts` | Mobile TS theme mirror | Header docblock |
| `apps/mobile/tailwind.config.js` | Mobile Tailwind config | Header docblock |
| `apps/web/[locale]/globals.css` | Web CSS var layer (v4) | Header banner |
| `apps/admin/globals.css` | Admin CSS var layer (v4) | Header banner |
| `packages/ui/theme/theme.css` | Shared CSS vars (v4 syntax) | Header banner |

**Not touched (intentional):**
- `apps/mobile/app/(auth)/phone.tsx`, `apps/mobile/app/(auth)/otp.tsx` — live code migration is left to a future sprint per the OTP hi-fi's existing "Implementation status note".
- `packages/ui/tokens/*.ts` — root SoT; values are correct; no boundary risk to banner.
- `docs/prd/ui/70-…78-*.md` — design principles unchanged by this work.

## Source-of-truth ladder

Documented in `nativewind-v4.md` §0.5 + `79-web-vs-mobile.md`:

1. **Hex values** → `packages/ui/tokens/colors.ts` (and sibling token files). All other files derive.
2. **Mobile HSL CSS vars** → `apps/mobile/global.css`. `apps/mobile/lib/theme.ts` mirrors exactly; `tailwind.config.js` references via `hsl(var(--…))`.
3. **Web/admin CSS vars (v4 syntax)** → `packages/ui/theme/theme.css`, extended per-app in `globals.css`.
4. **Mobile UI rules + customization patterns** → `docs/agents/nativewind-v4.md`.
5. **Web ↔ mobile boundary rules** → `docs/prd/ui/79-web-vs-mobile.md`.
6. **Design principles + non-system content** → `docs/prd/ui/70-…77-*.md` (unchanged).

## Token-name canonicalization rule

Added to `nativewind-v4.md` §3 and mirrored in `79-web-vs-mobile.md`:

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

**`destructive` vs `error-500` is intentional, not duplicate.** `bg-destructive` = destructive ACTION semantic (auto-swaps with theme). `text-error-500` = error STATE status (locked hue, identical in both modes). Both keep their canonical use; the decision tree above tells agents which to reach for.

## §2: `nativewind-v4.md` customization expansion

### §0.5 (NEW) — Mobile stack ≠ web stack: the boundary rule

One paragraph between §0 (pre-styling research) and §1 (the contract):

> Mobile = NativeWind v4 + Tailwind v3 + RNR (`@/components/ui/*`). Web/admin = Tailwind v4 + shadcn (`@auto-tm/ui/components`). Token VALUES are shared via `packages/ui/tokens/`. CSS syntax is NOT shared: mobile uses `@tailwind base; @tailwind components; @tailwind utilities;`, web uses `@theme inline { … }`. Components are NOT shared: RN `<Pressable>` ≠ DOM `<button>`. The full matrix lives in `docs/prd/ui/79-web-vs-mobile.md`; read it for any cross-platform decision.

### §4 expansion — Token vs bracket utility rule

Add ~5 lines to the existing §4 "what is and isn't legal to change":

> Add a new token only if it's used in 3+ places OR represents a brand identity moment. Otherwise reach for a bracket utility: `bg-destructive/10`, `text-foreground/60`, `border-primary/40`. Bracket utilities are free, don't burden the four-file cascade, and read at the call site.

### §7.4 (NEW) — Customization decision tree (the routing layer)

```
Need a styling/behavior change vs the RNR default?
├─ One call site, one-off?                      → cn() at the call site
├─ 2 call sites, same change?                   → still cn() — extract only if it grows
├─ 3+ call sites OR brand-locked?               → Add a CVA variant to the component file (§7.6)
├─ Need a structural slot RNR lacks
│   (leading prefix, trailing button)?          → Custom composition wrapping RNR (§7.5)
├─ Visual contract of the whole primitive
│   changes for AutoTM (rare)?                  → Edit CVA BASE classes — ADR required (§7.6)
├─ Need a fork due to incompatible variant sets? → New sibling file — ADR required (§7.7)
└─ Primitive doesn't exist in RNR               → New file in components/ui/ via @rn-primitives or §6.9
```

### §7.5 (NEW) — Custom composition wrapping an RNR primitive (PhoneInput worked example)

Rules:
- **File location**: `apps/mobile/components/<feature>/<Name>.tsx`. **NOT** `apps/mobile/components/ui/` — that path is reserved for RNR-installed primitives so the RNR CLI doesn't clobber custom code.
- **Imports the RNR primitive** — does NOT reimplement it. Wraps it in a styled `<View>` for the additional slots/chrome.
- **Chrome uses semantic tokens** (`bg-card`, `border-input`, `border-border`) so dark mode auto-swaps.
- **Prop API includes parent-controlled booleans** (e.g., `hasError`) so the call site doesn't ternary-classNames inline.
- **Full ~30-line PhoneInput example** included verbatim in the guide (locked `+993` prefix + divider + RNR `<Input>` underneath).

### §7.6 (NEW; supersedes existing §7.1's coverage) — Adding a CVA variant vs editing base classes

- **VARIANTS map**: visual STATES (e.g., `default | outline | brand-outline`). Add a new key when ≥3 screens need it.
- **BASE classes** (first arg to `cva()`): apply to ALL variants. Change ONLY when universal (e.g., bumping `rounded-md` → `rounded-lg` for ALL buttons in the app). Universal base-class edits require an ADR.
- **LOCKSTEP rule**: paired CVAs (e.g., `buttonVariants` + `buttonTextVariants`) MUST get the same new variant key. Anti-pattern: adding `brand-outline` to `buttonVariants` but not `buttonTextVariants` → unreadable text on brand-outline buttons.
- **Key naming convention**: prefer kebab-case strings (matches RNR house style) — `"outline-brand"`, `"brand-locked"`.

### §7.7 (NEW) — Forking a primitive (last resort)

- **Default**: edit the RNR file in place. RNR philosophy is "you own the file."
- **Fork** to `apps/mobile/components/ui/<name>-brand.tsx` ONLY when: (a) the semantic of the primitive itself diverges (e.g., a "BrandButton" that explicitly cannot have a `destructive` variant), OR (b) multiple incompatible variant sets are needed and one file becomes a CVA megafactory.
- **Cost**: every RNR CLI upgrade now requires manual reconciliation.
- **ADR REQUIRED** for any fork. No fork lands without one.

### §7.8 (NEW) — Anti-patterns when customizing

- Forking when `cn()` at the call site would do.
- Adding a token when `bg-destructive/10` (bracket utility) would do.
- Adding a CVA variant for a one-off (use `cn()`).
- Custom composition that hand-rolls a Pressable + TextInput when it could wrap the RNR primitive.
- Forgetting the `buttonVariants`/`buttonTextVariants` lockstep.
- Custom compositions placed inline in a route file when they belong in `components/<feature>/`.
- Editing base classes for what should be a variant.
- Inlining a hex in a custom composition because "it's just one place."

### §8 cross-link

The existing §8 anti-patterns table gets one new row at the top: `cf. §7.8 for customization-specific anti-patterns`. The two lists stay non-duplicated but cross-referenced.

## §3: Per-file banners

Each banner is an idempotent header comment block (6–10 lines, no functional change). Verbatim drafts:

**`apps/mobile/global.css`:**
```
/* AutoTM mobile CSS variables — Tailwind v3 + NativeWind v4
 * AUTHORITY: This file + apps/mobile/lib/theme.ts are PRIMARY for mobile
 * semantic tokens (--background, --primary, etc.). HSL values mirror
 * lib/theme.ts exactly and derive from packages/ui/tokens/colors.ts.
 * DO NOT copy from apps/web/[locale]/globals.css or packages/ui/theme/theme.css
 * — those use Tailwind v4 @theme syntax which breaks Metro on mobile.
 * Rules: docs/agents/nativewind-v4.md §0.5, §2, §4.
 */
```

**`apps/mobile/lib/theme.ts`:**
```
/**
 * AutoTM mobile runtime theme — mirror of apps/mobile/global.css.
 * react-navigation ThemeProvider reads this; CSS reads global.css.
 * Both must agree HSL by HSL. Edit one → edit the other.
 * SoT ladder: tokens/colors.ts (hex) → global.css (HSL vars) → THIS FILE (HSL strings).
 * Rules: docs/agents/nativewind-v4.md §0.5.
 */
```

**`apps/mobile/tailwind.config.js`:**
```
/**
 * AutoTM mobile Tailwind config — v3 + NativeWind v4 preset.
 * Extends @auto-tm/ui/theme/tailwind with shadcn-style semantic colors
 * resolving via CSS vars from global.css. Locked to v3 due to NativeWind +
 * Metro constraints. Web/admin use v4 in a different config shape.
 * Rules: docs/agents/nativewind-v4.md §0.5, §2.5.
 */
```

**`apps/web/[locale]/globals.css`:**
```
/* AutoTM public web CSS — Tailwind v4 (@theme inline syntax).
 * Web/admin use Tailwind v4 + shadcn/ui (@auto-tm/ui/components).
 * Mobile uses Tailwind v3 + NativeWind v4 + RNR — DO NOT copy this
 * syntax to apps/mobile/global.css. The @theme directive does not exist
 * in v3 and Metro will fail at build time.
 * Boundary rules: docs/prd/ui/79-web-vs-mobile.md.
 */
```

**`apps/admin/globals.css`:** same as web, renamed.

**`packages/ui/theme/theme.css`:**
```
/* AutoTM shared theme CSS — Tailwind v4 ONLY.
 * Consumed by apps/web/[locale]/globals.css and apps/admin/globals.css.
 * The @theme blocks are Tailwind v4 syntax — NEVER import this file into
 * apps/mobile (Tailwind v3). Mobile defines its own CSS vars in
 * apps/mobile/global.css. Token VALUES on both sides derive from
 * packages/ui/tokens/colors.ts.
 * Boundary rules: docs/prd/ui/79-web-vs-mobile.md.
 */
```

## §4: Skill + command updates

Both `.claude/commands/{wireframe,hifi-design}.md` and `.agents/skills/{wireframe,hifi-design}-agent-skill/SKILL.md` get parallel edits. The skill files already declare themselves mirrors of the commands; this work keeps that contract.

**Both files (all four) get:**

1. **Hard rules section** — one new line near the top of §0:
   > Read `docs/agents/nativewind-v4.md` §0.5 (web/mobile boundary) before any mobile output. Read §7.4–7.8 (customization paths) before specifying any non-default RNR usage.

2. **Read first section** — add to §1:
   > `docs/agents/nativewind-v4.md` §7.4 (decision tree), §7.5 (custom compositions), §7.6 (CVA variants), §7.8 (anti-patterns).

**Wireframe-only addition** — new OPTIONAL output sub-section between "Numbered content blocks" and "Interactions":

```
## Customization preview (mobile-only; skip if all primitives use defaults)

- <Primitive name> — <one-liner: "needs leading-slot composition" /
  "needs brand-outline variant" / "needs hidden-input composition for OTP cells">
- ...
```

Self-check item added:
> Mobile wireframes only: If any primitive named won't fit a stock RNR variant, surface it in §Customization preview.

**Hifi-design-only addition** — new REQUIRED output section between "Component shape" and "States":

```
## Customization plan

For each non-default RNR usage, list:
- Primitive: <RNR component or "new primitive">
- Path (per nativewind-v4.md §7.4): <cn at call site | new CVA variant |
  custom composition wrapping RNR | base-class edit | fork | new primitive>
- File: <apps/mobile/components/ui/<file>.tsx for variant edits
       | apps/mobile/components/<feature>/<Name>.tsx for compositions
       | docs/adr/<NN>-<slug>.md for forks (ADR required)>
- For variants: name + paired CVA edits (variants + textVariants if applicable)
- For compositions: prop API summary + ~30-line shape
- For forks: ADR reference + rationale

If nothing needs customization, write: "None — all RNR primitives used at defaults."
```

Self-check items added:
- Mobile specs only: If any RNR primitive uses a non-default variant OR is wrapped in a custom composition OR is forked, the §Customization plan lists each with path + file.
- Mobile specs only: Custom compositions live under `apps/mobile/components/<feature>/`, NOT `apps/mobile/components/ui/`.
- Mobile specs only: Paired CVAs (e.g., `buttonVariants` + `buttonTextVariants`) are edited in lockstep.

**Both files** — bail conditions add:
> Stop if customization needs a fork but no ADR exists. Suggest `/new-adr` first.

## §5: OTP hi-fi rewrite

Changes to `docs/prd/ui/hifi/mobile-otp-login-flow.md`:

1. **§Implementation status note** (currently lines 22–30) rewritten to reference new `nativewind-v4.md` §7.4–7.8 vocabulary and lay out the migration as a clean 6-step list:
   1. Install RNR per `nativewind-v4.md` §2 (one-time).
   2. Add `PhoneInput` per §Customization plan below.
   3. Add `OtpCells` per §Customization plan below.
   4. Swap raw palette classes for semantic tokens (`bg-background`, `text-foreground`, `border-border`, `bg-card`, `bg-muted`, `border-primary`, `border-destructive`).
   5. Drop imperative `palette.neutral[…]` icon colors — use `<Icon as={X} className="text-foreground">`.
   6. Run `nativewind-v4.md` §9 verification gate.

2. **NEW §Customization plan section** (between "Component shape" and "States"):

   **A. PhoneInput** — custom composition wrapping RNR `Input`
   - Path (§7.5): custom composition
   - File: `apps/mobile/components/auth/PhoneInput.tsx`
   - Why: RNR `Input` doesn't ship a leading-slot API; we need a locked `+993` prefix with a divider.
   - Prop API: `hasError?: boolean`, `prefix?: string` (default `+993`), plus all native `TextInput` props via spread.
   - ~30-line shape (locked prefix `<View>` + divider + RNR `<Input>` underneath, all semantic tokens, `forwardRef<TextInput>`).

   **B. OtpCells** — custom composition wrapping a hidden RN `TextInput`
   - Path (§7.5): custom composition (uses raw RN `TextInput` because the hidden-input pattern doesn't fit RNR `Input`'s class-merging assumptions)
   - File: `apps/mobile/components/auth/OtpCells.tsx`
   - Why: 6 visual cells over one hidden numeric input + the shake animation. Composition owns the `Animated.Value` so the route file doesn't.
   - Prop API: `length = 6, value, onChange, hasError`; exposes `useImperativeHandle` with `focus()` and `shake()`.
   - ~50-line shape: `Animated.View` with internal `translateX` shake; cells use `bg-card` filled / `bg-muted` empty / `border-primary` focused / `border-destructive` error.

   **C. Button "link" inline pattern** — `cn()` at call site
   - Path (§7.4 first row): `cn()` override
   - Used for "Change number" and "Resend code": `<Button variant="link" className="self-start px-0">`
   - No new variant needed (used only twice; promote to a CVA variant only if a third screen needs it).

3. **§Component shape rewrite** — route skeletons (`phone.tsx`, `otp.tsx`) become significantly shorter. They import the two compositions:

   ```tsx
   // phone.tsx
   import { PhoneInput } from "@/components/auth/PhoneInput";
   <PhoneInput hasError={hasError} value={phoneDisplay}
     onChangeText={handlePhoneChange} placeholder={t("auth.phone.placeholder")}
     accessibilityLabel={t("auth.phone.label")} />
   ```

   ```tsx
   // otp.tsx
   import { OtpCells, type OtpCellsHandle } from "@/components/auth/OtpCells";
   const otpRef = useRef<OtpCellsHandle>(null);
   // on wrong code: otpRef.current?.shake();
   <OtpCells ref={otpRef} value={code} onChange={setCode} hasError={!!otpError} />
   ```

4. **§Token map** — add one line at the top pointing at `nativewind-v4.md` §3 decision tree, so the choice of `bg-card` vs `bg-popover` vs `bg-muted` is justified rather than arbitrary.

5. **§Self-check expansion**:
   - §Customization plan section present and lists PhoneInput + OtpCells.
   - Custom compositions live under `apps/mobile/components/auth/`, NOT `apps/mobile/components/ui/`.
   - `OtpCells` owns the shake animation via `useImperativeHandle`; route file does not redeclare an `Animated.Value`.
   - Button "link" inline pattern uses `cn()`, not a new CVA variant (justification: 2 use sites).

6. **Wireframe back-edit** to `docs/prd/ui/wireframes/mobile-otp-login-flow.md` — add §Customization preview blocks under the "Phone entry" and "OTP entry" wireframes (one line each: "needs PhoneInput composition (leading +993 slot)", "needs OtpCells composition (hidden input + shake)").

**Note about BrandLogo**: stays at `apps/mobile/src/auth/BrandLogo.tsx`. It's a thin SVG wrapper, not an RNR primitive customization; no §Customization plan entry.

**Note about live route code**: `apps/mobile/app/(auth)/phone.tsx` and `otp.tsx` are NOT touched by this work. The hi-fi's "Implementation status note" remains the bridge until a future sprint migrates the code per the 6-step list above.

## §6: Verification

**Static checks (per PR):**

1. **Section-number integrity** — every "§X.Y" reference in nativewind-v4.md, 79-web-vs-mobile.md, the OTP hi-fi/wireframe, and the four skill+command files resolves to a real section. Grep recipe:
   ```bash
   grep -nE '§[0-9]+(\.[0-9]+)*' docs/agents/nativewind-v4.md docs/prd/ui/79-web-vs-mobile.md \
     docs/prd/ui/hifi/mobile-otp-login-flow.md docs/prd/ui/wireframes/mobile-otp-login-flow.md \
     .claude/commands/wireframe.md .claude/commands/hifi-design.md \
     .agents/skills/wireframe-agent-skill/SKILL.md .agents/skills/hifi-design-agent-skill/SKILL.md
   ```
2. **Parallel-file sync** — `diff -u` of new sections between `.claude/commands/<x>.md` and `.agents/skills/<x>-agent-skill/SKILL.md` is near-zero (frontmatter aside).
3. **Banner presence** — every file in the §3 list has the new header banner at the top (verified by `head -10` on each).
4. **No new hex** — `grep -nE '#[0-9a-fA-F]{3,8}' docs/agents/nativewind-v4.md` returns only existing entries.

**Agent smoke test (1 dry-run before merging the final PR):**

5. Run `/hifi-design fake screen with a brand-outline button and a leading-icon input`. Verify the output includes a §Customization plan with two entries (Button CVA variant + custom composition), with the right files cited and the `buttonVariants`/`buttonTextVariants` lockstep mentioned. If the dry-run skips the §Customization plan, the §4 prompt edits need tightening.

**No-regression checks:**

6. `nativewind-v4.md` §9 verification gate is unchanged. No mobile dev workflow is altered.
7. The OTP hi-fi's existing sections (Token map, States, Motion, Accessibility, Trilingual copy) still pass their existing self-checks.
8. The "Implementation status note" still correctly says: live `phone.tsx`/`otp.tsx` are unchanged; migrate per §Customization plan + run §9 gate.

**Out of scope (flagged for follow-up):**

9. **Cross-reference link-checker script** — a future ADR + PR could add `scripts/verify-doc-refs.sh` to CI to catch dangling §X.Y refs automatically.
10. **Live OTP code migration** — `apps/mobile/app/(auth)/phone.tsx` and `otp.tsx` get migrated to RNR + the new compositions in a future sprint.
11. **Pre-commit hook for the four-file mobile cascade** — `colors.ts` ↔ `global.css` ↔ `lib/theme.ts` agreement could be enforced by script, not just by doc rules.

## PR sequencing

Four small, vertically-sliced PRs. Each independently mergeable; each verifiable on its own. PR 1 is the foundation that 2–4 reference.

- **PR 1 — Foundation: `nativewind-v4.md` expansion.** Adds §0.5, §4 expansion, §7.4–7.8, §8 cross-link. ~150–250 lines of new content. Title: `docs(mobile-ui): expand RNR customization patterns (§7.4–7.8)`.
- **PR 2 — Boundaries: `79-web-vs-mobile.md` expansion + 6 file banners.** Edits 7 files; each banner is 6–10 lines. Title: `docs(mobile-ui): tailwind v3/v4 boundary banners + web-vs-mobile expansion`.
- **PR 3 — Process: wireframe + hifi-design (commands AND skills).** Edits 4 files in parallel. Title: `docs(skills): require Customization plan in hifi-design + preview in wireframe`.
- **PR 4 — Proof-point: OTP hi-fi + wireframe rewrite.** Edits 2 files using the new vocabulary; introduces PhoneInput + OtpCells customization plans. Title: `docs(ui): redesign OTP hi-fi with formalized PhoneInput + OtpCells compositions`.

Dependencies: 2 ⊇ 1 (banners cite §0.5 from PR 1). 3 ⊇ 1 (skills cite §7.4 from PR 1). 4 ⊇ 1, 3 (OTP hi-fi uses §Customization plan structure from PR 3 and §7.4–7.8 from PR 1).

## Decisions deferred

- Whether to ALSO run a code migration sprint immediately after these docs land, or wait for the next planned mobile sprint. (Default: wait.)
- Whether `PhoneInput` and `OtpCells` should live under `components/auth/` (this design) or a flatter `components/<Name>.tsx` (simpler tree, no feature folder). (Default: `auth/` — matches the existing `src/auth/` feature folder convention.)
- Whether to ship the cross-reference link-checker script in a Sprint-N+1 cleanup PR or defer indefinitely.

## Out of scope (explicit)

- Migrating `apps/mobile/app/(auth)/phone.tsx` and `otp.tsx` to RNR. Tracked by the OTP hi-fi's Implementation status note.
- Adding new tokens to `packages/ui/tokens/`. The §4 expansion explicitly DISCOURAGES new tokens for one-off needs.
- Changing the mobile verification gate (`nativewind-v4.md` §9). Unchanged.
- Web/admin component or styling changes. Out of scope.
- Forking any RNR primitive. None of the OTP customizations require a fork; the §7.7 rule explicitly says no fork lands without an ADR.
