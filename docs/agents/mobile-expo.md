# Mobile / Expo agent checks

Use this checklist for any `mobile` issue, Expo SDK package change, Metro failure, Codegen failure, navigation/router change, or Expo Go runtime crash.

## First rule

Do not patch `node_modules`, Codegen, Metro resolution, or native-package entrypoints until Expo's dependency check has run. Expo Go ships native modules at SDK-specific versions; mismatched JavaScript packages can compile and still crash at runtime.

## Required package check

Run this before changing versions or debugging native-module crashes:

```bash
CI=1 pnpm --filter @auto-tm/mobile exec expo install --check
```

If it fails, align with Expo first:

```bash
CI=1 pnpm --filter @auto-tm/mobile exec expo install --fix
pnpm install --force
CI=1 pnpm --filter @auto-tm/mobile exec expo install --check
```

`pnpm install --force` is required after package alignment because stale pnpm symlinks in `apps/mobile/node_modules` can keep pointing at the previous store entry.

## Required verification gate

For any mobile change, run:

```bash
pnpm --filter @auto-tm/mobile typecheck
CI=1 pnpm --filter @auto-tm/mobile exec expo install --check
pnpm --filter @auto-tm/mobile exec expo export -p ios --clear
```

For runtime-only bugs or simulator crashes, also run Expo Go and inspect logs:

```bash
pnpm --filter @auto-tm/mobile exec expo start --clear --go --ios
node scripts/expo-logs.js --once
```

Capture a simulator screenshot for UI/runtime claims:

```bash
xcrun simctl io booted screenshot /tmp/auto-tm-expo-go.png
```

Stop Metro before handing back the task.

## Known SDK 55 pitfalls

- Keep `.npmrc` with `shamefully-hoist=true`; Metro expects flat React Native dependencies under pnpm.
- Keep `react-native-reanimated` and `react-native-worklets` as explicit Expo-installed app dependencies. SDK 55's Expo docs install them together, and Reanimated 4 initializes through Worklets; relying on a transitive Worklets peer can compile but crash in Expo Go with vague `Exception in HostFunction` errors when RNR components import builders such as `FadeIn` / `FadeOut`.
- Keep `react-native-screens` on its React Native/Fabric source path. Do not redirect it to `lib/commonjs`; that caused `RNSSafeAreaView` view-config crashes.
- Do not patch `@react-native/codegen` for `react-native-screens` unless the package check is already clean and a fresh Codegen/parser repro proves the current aligned toolchain still fails.
- `expo-router@55.0.14` ships the internal router modules needed by SDK 55. Do not restore old `expo-router@6.0.23` shims or postinstall patches.
- Expo Go is valid for current routing/auth smoke tests. Use a custom dev client only for project-native code or modules Expo Go does not bundle, such as the `react-native-compressor` video path.

## Documentation duty

If this checklist changes the diagnosis, update `apps/mobile/CONTEXT.md`. If it changes the architecture decision, add a dated ADR or errata note instead of leaving stale guidance in agent docs.
