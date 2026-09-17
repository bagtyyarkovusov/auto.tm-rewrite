# ADR-0048: Pin react-native-css-interop with a pnpm override, not a direct mobile dependency

- **Status**: Accepted
- **Date**: 2026-09-16
- **Deciders**: AutoTM founder + AI architect

## Context

`nativewind@4.2.3` declares `react-native-css-interop` as an **exact** dependency:

```json
"dependencies": { "react-native-css-interop": "0.2.3" }
```

`apps/mobile/package.json` separately declared `"react-native-css-interop": "^0.2.4"`,
added in `19c2d15` alongside the bottom-navbar restructure. pnpm honoured both, so
the workspace carried two copies: `0.2.3` hoisted at the root (satisfying
nativewind) and `0.2.4` under `apps/mobile/node_modules`.

The two versions differ in exactly one source file. `0.2.4` fixes
[nativewind#1722](https://github.com/nativewind/nativewind/issues/1722): on
React Native 0.82+, `Appearance` can emit `"unspecified"` during an
`AppState` background→foreground transition. `0.2.3` coerces that to `"light"`:

```ts
// 0.2.3
systemColorScheme.set(state.colorScheme ?? "light");

// 0.2.4
systemColorScheme.set(resolveColorScheme(state.colorScheme));
```

`apps/mobile` runs React Native **0.83.10** and ships a dark theme, so on
`0.2.3` backgrounding and re-foregrounding the app silently reverts it to light
mode. The `^0.2.4` declaration was therefore correct in intent — it was a
deliberate fix, not drift.

What made it fragile is *how* it took effect. The app got `0.2.4` only because
`apps/mobile/metro.config.js` sets

```js
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;
```

With hierarchical lookup disabled, every bare specifier in the bundle — including
nativewind's own `require("react-native-css-interop")` — resolves through that
ordered list, and `apps/mobile/node_modules` came first. Confirmed against the
real bundle: `0.2.4`'s `resolveColorScheme` is present, `0.2.3`'s
`getColorScheme() ?? "light"` is absent, and only one copy is bundled.

That is three coupled facts — an off-spec direct dependency, an array order, and
a resolver flag — holding up a dark-mode bug fix, with no comment in any of the
three files pointing at the other two. Those two `metro.config.js` lines read as
generic monorepo boilerplate; deleting or reordering them silently regresses dark
mode with no build error and no failing test. Node-side tooling (the Babel
preset, the Metro transformer, vitest) resolved by Node's own algorithm and got
`0.2.3` regardless.

NativeWind's own installation guide lists only `nativewind` as the package to
install; `react-native-css-interop` appears solely as a Next.js
`transpilePackages` entry, never as a direct application dependency.

## Decision

**Express the version floor as a pnpm override in the root `package.json`, and
remove `react-native-css-interop` from `apps/mobile/package.json`.**

```json
"pnpm": {
  "overrides": {
    "react-native-css-interop": "0.2.4"
  }
}
```

The override rewrites nativewind's exact pin at resolution time, so the whole
workspace resolves one copy. Verified after `pnpm install --force`: a single
`react-native-css-interop@0.2.4` in the store, `0.2.4` hoisted at the root, and
`0.2.4` returned when resolving from `node_modules/nativewind`. Zero references
to `0.2.3` remain in `pnpm-lock.yaml`.

`metro.config.js` is left unchanged — `nodeModulesPaths` and
`disableHierarchicalLookup` are still needed for `shamefully-hoist` monorepo
resolution — but the dark-mode fix no longer depends on them, because there is
no longer a second version for the ordering to choose between.

## Consequences

- Dark mode survives a background→foreground transition, and that no longer
  depends on Metro resolver configuration.
- Build-time and runtime agree. The Babel preset, the Metro transformer and
  vitest now see the same version as the bundle.
- `apps/mobile` matches NativeWind's documented dependency set, so
  `expo install --check` and future NativeWind upgrades reason about one
  declaration instead of two competing ones.
- The override must be revisited when nativewind is upgraded. If a future
  nativewind pins a css-interop **newer** than the override, the override
  silently downgrades it. The mitigation is procedural: when bumping
  nativewind, read its `dependencies` and either raise or delete this override.
- Removing a stale hoisted copy needed manual intervention: `pnpm install`
  reported "Already up to date" while `node_modules/react-native-css-interop`
  still held `0.2.3`. Recovering required deleting both the hoisted directory
  and the orphaned `.pnpm` entry, then `pnpm install --force`. This is the same
  stale-symlink class of problem `CLAUDE.md` already documents for Expo package
  changes.

## Alternatives considered

**Bump nativewind.** The version that relaxes the exact pin is NativeWind v5,
which is still pre-release and is a breaking change across all twelve
workspaces that consume Tailwind tokens. Out of scope for a launch-stabilisation
branch; revisit as its own ADR.

**Keep the direct dependency and document the resolver coupling.** Cheaper, but
it leaves correctness resting on array order in a file whose purpose is
unrelated, and leaves Node-side tooling on `0.2.3`.

**Drop to `0.2.3` everywhere.** Removes the divergence and reintroduces the
dark-mode bug on the exact React Native version we ship. Rejected.

**`pnpm.packageExtensions` to widen nativewind's range.** Expresses "any 0.2.x"
rather than a floor, so a future install could resolve *back* to `0.2.3`.
An override states the intent precisely.
