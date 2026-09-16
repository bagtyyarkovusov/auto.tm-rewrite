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

For runtime-only bugs or crashes, build and run a development build. Expo Go is
not an option for this app (see the SDK 55 pitfalls below):

```bash
pnpm --filter @auto-tm/mobile exec expo run:android
node scripts/expo-logs.js --once
```

Capture a screenshot for UI/runtime claims. On the Android emulator:

```bash
adb exec-out screencap -p > /tmp/auto-tm-android.png
```

The emulator also needs the host stack reachable, since `EXPO_PUBLIC_*` point at
`localhost`:

```bash
for p in 8081 3006 9000; do adb reverse tcp:$p tcp:$p; done
```

Stop Metro before handing back the task.

## Known SDK 55 pitfalls

- Keep `.npmrc` with `shamefully-hoist=true`; Metro expects flat React Native dependencies under pnpm.
- Keep `react-native-reanimated` and `react-native-worklets` as explicit Expo-installed app dependencies. SDK 55's Expo docs install them together, and Reanimated 4 initializes through Worklets; relying on a transitive Worklets peer can compile but crash in Expo Go with vague `Exception in HostFunction` errors when RNR components import builders such as `FadeIn` / `FadeOut`.
- Keep `react-native-screens` on its React Native/Fabric source path. Do not redirect it to `lib/commonjs`; that caused `RNSSafeAreaView` view-config crashes.
- Do not patch `@react-native/codegen` for `react-native-screens` unless the package check is already clean and a fresh Codegen/parser repro proves the current aligned toolchain still fails.
- `expo-router@55.0.14` ships the internal router modules needed by SDK 55. Do not restore old `expo-router@6.0.23` shims or postinstall patches.
- **Expo Go can no longer run this app.** `app/(tabs)/chat.tsx` imports `useChatPushTokenRegistration`, which pulls in `expo-notifications` at module load; Expo Go dropped remote-push native code in SDK 53, so the app throws on launch. A development build is required for every runtime check, not just for `react-native-compressor`. This regressed when S10 added push registration to the chat tab.

## Local Android build pitfalls

- **`ANDROID_HOME` must be exported in the shell that runs `expo run:android`.** `apps/mobile/android/local.properties` is not committed and `expo prebuild` does not generate it, so a shell without the SDK env fails at configuration time with `SDK location not found`, even though `adb` may work from an interactive terminal that sources a profile. Export it before building:

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
```

- **Gradle can fail to download `com.facebook.react:react-android` with `bad_record_mac`.** The symptom is many simultaneous task failures that all name the same artifact:

```
Could not download react-android-0.83.10-debug.aar
  > (bad_record_mac) Insufficient buffer remaining for AEAD cipher fragment
```

  This is not a network outage and not a dependency-alignment problem — `curl` fetches the same 236 MB artifact fine. It is the Gradle daemon's JDK TLS 1.3 stack failing on a large AEAD transfer. Confirm the network first, then force TLS 1.2 for the daemon:

```bash
cd apps/mobile/android
./gradlew app:assembleDebug -x lint -x test -PreactNativeArchitectures=arm64-v8a \
  -Dorg.gradle.jvmargs="-Xmx4g -XX:MaxMetaspaceSize=1g -Djdk.tls.client.protocols=TLSv1.2"
```

  Once the artifact is cached, `expo run:android` succeeds normally. Do not "fix" this by pinning React Native versions or clearing `node_modules`; the artifact coordinates are correct.

## Documentation duty

If this checklist changes the diagnosis, update `apps/mobile/CONTEXT.md`. If it changes the architecture decision, add a dated ADR or errata note instead of leaving stale guidance in agent docs.
