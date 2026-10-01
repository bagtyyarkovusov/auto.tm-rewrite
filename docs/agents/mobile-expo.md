# Mobile / Expo agent checks

Use this checklist for any `mobile` issue, Expo SDK package change, Metro failure, Codegen failure, navigation/router change, or Expo Go runtime crash.

For component behavior tests, use the [mobile testing guide](mobile-testing.md).

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
- **Expo Go can no longer run this app.** `app/(tabs)/chat.tsx` imports `useChatPushTokenRegistration`, which pulls in `expo-notifications` at module load; Expo Go dropped remote-push native code in SDK 53, so the app throws on launch. A development build is required for every runtime check. This regressed when S10 added push registration to the chat tab.

## Local Android build pitfalls

- **Use an installed JDK 17 for Android builds and set `JAVA_HOME` explicitly.** With a JDK 21 daemon and no discoverable JDK 17, React Native 0.83.10 attempts toolchain provisioning through Foojay 0.5.0. That resolver references `IBM_SEMERU`, removed in Gradle 9, and configuration fails before compilation. Selecting the installed JDK 17 avoids that provisioning path. On macOS with Homebrew's `openjdk@17`, its home is `<brew-prefix>/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home`. Do not patch `node_modules` to work around a missing local JDK. See the [upstream resolver compatibility report](https://github.com/gradle/foojay-toolchains/issues/151).

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

Update this guide when the operating procedure changes. Update `apps/mobile/CONTEXT.md` only when its documented boundary, constraint, or important limitation changes. Keep individual diagnoses in task evidence. Supersede changed architecture decisions with a new ADR; preserve merged ADR text.

## Railway PR backend sessions

[ADR-0075](../adr/0075-railway-pr-backends-for-agent-native-sessions.md) uses staging-based Railway PR environments with demo data and mock SMS. Hosted CI runs container-backed tests. Locally run `pnpm test:unit`, typecheck, affected lint and applicable exports. Keep Docker stopped for native proof. The coordinator assigns explicit simulator UUIDs and distinct Metro ports, with up to two sessions when capacity permits, and one heavy local phase at a time.

1. Open the issue's draft PR and wait for Railway's `auto.tm-rewrite-pr-<PR>` environment. PR environments are enabled from staging with Bot and Focused modes off. Read the environment ID and API service domain through the Railway dashboard or CLI. Use explicit environment and service IDs on every command. Existing PR clones can retain an old MinIO image; verify the ADR-0074 pinned image and a successful deployment.
2. Provision a project token for that environment through project Settings > Tokens, or the coordinator's `projectTokenCreate` API operation with `environmentId`. Railway supports environment-scoped tokens. Save it outside the repo in an owner-only file, load it as `RAILWAY_TOKEN`, and unset account/workspace `RAILWAY_API_TOKEN` for agent operations. Verify `query { projectToken { projectId environmentId } }` using `railway api`. The returned environment must equal this PR's ID. Never use a staging or production token for the seed.
3. Check the API's `/readyz` response for this environment and the PR backend commit. After backend commits, wait for the corresponding deployment's `SUCCESS` and read the new `commitSha`; a successful prior deployment is insufficient. Confirm worker boot and MinIO readiness. Migrations belong to the API pre-deploy command.
4. In the PR API service only, set `DATABASE_PUBLIC_URL` to the Railway reference `${{Postgres.DATABASE_PUBLIC_URL}}`. Set `MINIO_PUBLIC_URL` to `https://${{MinIO.RAILWAY_PUBLIC_DOMAIN}}` in the PR API and worker services, and `NEXT_PUBLIC_MINIO_PUBLIC_URL` to the same reference in PR admin/web. Staging may contain literal URLs that duplication preserves, so read back hostnames and confirm they belong to this PR. The seed rejects inherited staging or other PR media origins. Keep `DATABASE_URL` and `MINIO_ENDPOINT` private for deployed services. Confirm `SMS_DRIVER=mock` and `APP_ENV=staging` before seeding. Run from the repository root:

   ```bash
   railway run --project "$PR_PROJECT_ID" --environment "$PR_ENVIRONMENT_ID" --no-local --service "$PR_API_SERVICE_ID" pnpm native:seed
   ```

   This one command bootstraps all four MinIO buckets, reference catalog, fixture users and listings with 0, 1 and 2 photos, then licensed brand logos. It is rerunnable and touches only demo fixture rows/media. It hard-rejects production, staging, missing or malformed names before running seed steps. `railway run` runs on the Mac, so the guarded command substitutes the public Postgres and MinIO connections. Do not print variable values or token files in evidence. Fixture phones include buyer `+99361000009` and seller `+99361000001`.
5. Point Metro at the PR API URL including `/api/v1`:

   ```bash
   EXPO_PUBLIC_API_URL="$PR_API_URL/api/v1" pnpm --filter @auto-tm/mobile exec expo start --dev-client --port "$METRO_PORT"
   ```

   For an installed iOS development client, its `RCT_jsLocation` preference must point at this session's Metro bundle URL, for example `http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false`. Use the assigned simulator's application preference file or dev-client launcher, and launch that explicit UUID. `RCT_jsLocation` chooses Metro; `EXPO_PUBLIC_API_URL` chooses the backend. Restart Metro with `--clear` if an old API origin remains in the bundle. Expo Go cannot run this app.
6. Log in with a fixture phone. Read the mock OTP from this PR API service's Railway logs, filtered to the request's phone/time. Do not put OTPs or access tokens in PR evidence. Capture the loaded feed and a fixture detail/gallery to prove media and API traffic. Record environment ID, successful deployment ID/backend SHA, screenshot paths and the process check showing Docker absent.
7. Stop only this session's Metro process. Revoke its token when finished. Railway automatically deletes the environment on PR merge/close; verify that its exact environment ID disappears. Close disposable proof PRs promptly and record deletion evidence. Do not close an active implementation PR just to collect cleanup evidence.
