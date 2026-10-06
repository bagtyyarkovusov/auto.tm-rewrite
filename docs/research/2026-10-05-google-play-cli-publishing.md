# Publishing and managing the Android app on Google Play from the command line

> Noncanonical research, dated 2026-10-05. It compares tools and records what Google's and the tools' own documents say. It does not set policy. Any adoption needs an ADR under the external-egress rule in [AGENTS.md](../../AGENTS.md) (see "Fit with this repo").

- **Date**: 2026-10-05 (every external source below was accessed on this date unless it says otherwise)
- **Question**: Which command-line tools let an agent-driven team publish and manage the Android app on Google Play so that the Play Console web UI is needed as little as possible?
- **Feeds**: [#320](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/320) (reviewer-only Android release map), [#327](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/327) (Console listing, declarations, reviewer access), [#329](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/329) (signed AAB freeze), [#391](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/391) (Data safety).
- **Status**: research only. No account was signed in, nothing was installed, and no Google API was called. Config and script snippets below are untested sketches.

> **Changed since this was written (2026-10-06).** The note below is kept as researched; these repo facts it relied on have moved:
>
> - The store release updates the existing Play app `com.auto_tm.ynamly` instead of creating `tm.auto.app` ([#697](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/697), PR 698). Read every `tm.auto.app` in the snippets as `com.auto_tm.ynamly`, and skip "Create the app": it exists and has completed its closed-test requirements.
> - The `production` profile in `apps/mobile/eas.json` now has `autoIncrement: true` with `appVersionSource: remote`, and the remote versionCode is set to 4, so the first new build is 5 (PR 698). The "No `autoIncrement`" row and its risk are resolved; there is still no `submit` block.
> - The upload key for `com.auto_tm.ynamly` is being reset to a key EAS generated; no `production` build runs before Play shows the new certificate. The current steps live in [88 — Play Console submission pack](../prd/ops/88-play-console-submission.md).

## Short answer

1. **The Play Console UI cannot be removed.** Creating the app, the first upload, the App content declarations (except Data safety), the content rating, target audience, countries, free/paid, the closed-testing production-access application and the final send-for-review all have no method in the Google Play Developer API reference. Every CLI is a wrapper over that API, so none of them can do these either.
2. **Google ships no Play publishing CLI.** The official Android CLI (1.0 stable since May 2026) has no Play commands. `gcloud` has no Play command group. Community CLIs exist (`gplay`, `gpc`) and cover most of the API, but both are eight months old or less, with one maintainer each.
3. **After the founder's one-time setup, three layers cover the daily work.** (a) EAS Build + EAS Submit, already in use here, uploads the AAB. (b) fastlane `supply` pushes listing text, screenshots and per-language release notes, promotes between tracks, and sets or halts staged rollouts. (c) A small direct API script covers what supply cannot: tester Google Groups, Data safety, reviews, country availability reads, and the Reporting API for vitals.
4. **Recommended default:** EAS Submit with `releaseStatus: draft`, plus fastlane `supply` with checked-in metadata, plus one small Node script. Do not adopt a community CLI for the first reviewer release. Reconsider after the release if the script grows.
5. **Keep the final send-for-review human.** An API `edits.commit` sends changes to review by default. A `draft` release is not rolled out, so the founder finishes it in the Console. This matches the #320 rule that the final Console submission is a separate human action.
6. **One blocker to check early:** Turkmen is not in Google's list of supported Play Console translation languages (checked 2026-10-05). RU and EN listings and release notes are possible. A TK listing and TK release notes look impossible. See "Open facts".

## What the repo already decides

| Fact | Source | Consequence |
|---|---|---|
| Expo SDK `~55.0.31`, React Native 0.83.10, managed workflow (no committed `apps/mobile/android/`) | `apps/mobile/package.json`; `ls apps/mobile` | Gradle Play Publisher needs a Gradle project, so it fits poorly. EAS Build already runs prebuild remotely. |
| `eas.json` has `staging`, `production-smoke` (APK) and `production` (`app-bundle`, `distribution: store`) build profiles. **No `submit` block.** `cli.appVersionSource` is `remote`. **No `autoIncrement`.** | `apps/mobile/eas.json` | A submit profile must be added. Expo's `eas.json` reference says `autoIncrement: false` is the default, so the second AAB would reuse versionCode `1`. Google Play refuses a versionCode already used ([Android versioning docs](https://developer.android.com/studio/publish/versioning)). |
| Package `tm.auto.app`, Expo owner `tkmdevelopers`, EAS project id in `app.config.js`, no `updates.url` | `apps/mobile/app.config.js` | The same package name goes in the Play Console app. No OTA channel is involved. |
| Android builds already run on EAS. A signed staging APK was built there (build `657eb3cc-...`), and the evidence note says EAS artifact links are non-expiring capability URLs and must not be pasted into a public repo. | [`issue-279-reviewer-flow-and-builds.md`](../prd/ops/evidence/issue-279-reviewer-flow-and-builds.md) | EAS Build and EAS Submit add no new vendor. Never paste artifact URLs into issues or PRs. |
| The Expo account's plan is too low for custom EAS environments, so `staging` and `production-smoke` share the `preview` environment. | same note, Finding 5; [ADR-0046](../adr/0046-production-smoke-host-approval.md) | Check plan limits before relying on robot users or concurrent builds. The Expo pricing page lists Free as 15 Android builds a month, one build at a time, low-priority queue ([Expo pricing](https://expo.dev/pricing)). |
| [ADR-0073](../adr/0073-ci-gates-and-release-bundles-run-on-github-hosted-runners.md) moved CI gates and the **server** release bundles to GitHub-hosted runners. It does not cover the Android AAB. | ADR-0073 | The AAB is built by EAS Build, not on a runner. A fastlane job that needs Ruby can run on an `ubuntu-latest` runner, consistent with ADR-0073, and needs no local Ruby install. |
| [ADR-0039](../adr/0039-phased-cloud-first-hosting.md): Railway first, store binaries bake `EXPO_PUBLIC_API_URL`, `auto.tm` (or a fallback) must be registered before the first store-binary submission. [#496](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/496) says the founder does not control `auto.tm` DNS and uses `autotm.bagtyyar.dev` for privacy, terms and deletion pages. | ADR-0039; #320 | The Console needs a live privacy URL and a live deletion URL before declarations can be completed. Tooling does not change this. |
| [ADR-0051](../adr/0051-auto-ru-inspired-mobile-discovery-before-google-play-review.md) changes mobile discovery before the Play review. | ADR-0051 | No tooling constraint. It only moves the release date. |
| "External service egress needs an approved decision." | [AGENTS.md](../../AGENTS.md) | EAS and Expo are already in use. The Google Play Developer API, Google Cloud service accounts and any community CLI are new outbound dependencies from developer or CI machines. Record them in an ADR before agents run them. |
| Never commit secrets. `.gitignore` covers `*.key`, `*-private-key.json`, `gcp-*.json`, `firebase-adminsdk-*.json`. `apps/mobile/.gitignore` covers `*.jks`, `*.key`. | `.gitignore`, `apps/mobile/.gitignore` | A downloaded Google service-account key is named `<project>-<id>.json`. **That name matches none of these patterns.** Add a pattern or keep keys outside the repo directory. |
| Release scope: reviewer-only Android, public signup off, final Console submission is a separate human action; Console work is founder-owned. | #320 | The recommended setup uploads drafts and leaves send-for-review to the founder. |
| Launch plan says to register Google Play Console as an **organization** account and to "verify current organization/testing policy in-console". | [`84-launch-plan.md`](../prd/ops/84-launch-plan.md) | Whether the 12-tester rule applies depends on the real account type. #324 already says not to assume it. |

## Comparison

"API" means the Google Play Developer API v3 (`androidpublisher`). A cell says "no" when the tool's source or docs show no code path for it. "UI" means the Console only.

| Capability | EAS Submit | fastlane `supply` | Gradle Play Publisher | Direct API (scripts) | Community CLIs (`gplay`, `gpc`) |
|---|---|---|---|---|---|
| Upload AAB to internal / closed / open / production | Yes (`track`: internal, alpha, beta, production) | Yes | Yes | Yes (`edits.bundles.upload` + `edits.tracks`) | Yes |
| First upload of a brand-new app | Expo says the default submit creates the first internal release once the app exists; set `releaseStatus: draft` to avoid a rollout. Reports from other tools say the API refuses non-draft releases on a draft app. Treat as manual. | No: supply needs one upload to exist first | No: first upload must be through the Console | No: the API has no app creation method | No: `gplay` documents the same boundary |
| Release notes per language | **No** (no field in `eas.json` submit schema) | Yes: `changelogs/<versionCode>.txt` or `default.txt` per locale | Yes: `release-notes/<lang>/<track>.txt` | Yes: `TrackRelease.releaseNotes[]` | Yes |
| Staged rollout | At submit time only: `releaseStatus: inProgress` + `rollout` 0 to 1 | Yes: `rollout`, `release_status` | Yes: `userFraction` | Yes | Yes (increase, pause, resume) |
| Halt a rollout | `releaseStatus: halted` exists in the schema, but no command changes an existing release (unverified: no such command in the docs read) | Yes: `release_status: halted` | Yes: `HALTED` | Yes | Yes |
| Promote between tracks | No | Yes: `track_promote_to` | Yes: `promoteArtifact` | Yes (edit the destination track) | Yes |
| Store listing text, graphics, screenshots | **No.** EAS Metadata explicitly does not manage Google Play listings | Yes: title, short and full description, video; icon, feature graphic; phone, 7-inch, 10-inch screenshots | Yes (and developer contact details, in-app products) | Yes (`edits.listings`, `edits.images`) | Yes |
| Tester lists | No | No | No | **Google Groups only.** The API docs say email lists "are not supported" | Same API limit |
| Create or manage a closed track | No | No | No | `edits.tracks.create` exists | Yes |
| Country availability | No | No | No | **Read only** (`edits.countryavailability.get`) | Read only |
| Data safety form | No | No | No | Yes: `applications.dataSafety` takes the CSV | Yes (`data-safety update`) |
| In-app products, reviews, vitals | No | No | In-app products yes | Yes (reviews: last week only) | Yes |
| Read Play review status of a release | No | No | No | No documented method (see "Open facts") | No |
| Auth | Service-account key stored in EAS; `EXPO_TOKEN` for the CLI | Service-account JSON key or Workload Identity file | Service-account key or ADC | Any Google credential with the `androidpublisher` scope | Service-account key |
| Runtime | Node (`eas-cli`) and Expo's servers do the upload | Ruby + Bundler | JVM + a Gradle project | Anything that can call HTTPS | Go binary or Node |
| Maintenance | `eas-cli` 24.10.0 released 2026-10-02, MIT | fastlane 2.240.1 released 2026-09-15, MIT, pushed today | v4.1.1 released 2026-08-11, README says "maintenance mode" | Google | `gplay` v1.0.0 (2026-09-26), `gpc` v1.0.0-rc.1 (2026-09-29) |

## Tool notes

### EAS CLI, EAS Submit, EAS Build, EAS Workflows

- **What it does.** `eas submit --platform android` uploads an `.aab` to Google Play. Flags include `--profile`, `--latest`, `--id`, `--path`, `--url`, `--wait` and `--non-interactive` ([eas-cli README via Context7 `/expo/eas-cli`](https://github.com/expo/eas-cli/blob/main/packages/eas-cli/README.md)). `eas build --platform android --auto-submit` chains the two ([Expo, Submit to Google Play](https://docs.expo.dev/submit/android/)).
- **Submit profile fields.** The schema allows exactly `serviceAccountKeyPath`, `track` (default `internal`), `releaseStatus` (default `completed`; `completed`, `draft`, `halted`, `inProgress`), `changesNotSentForReview` (default `false`), `applicationId` and `rollout` (required if `inProgress`, forbidden otherwise) ([`eas-json` schema.ts](https://github.com/expo/eas-cli/blob/main/packages/eas-json/src/submit/schema.ts), [types.ts](https://github.com/expo/eas-cli/blob/main/packages/eas-json/src/submit/types.ts); [Expo, eas.json](https://docs.expo.dev/eas/json/)). There is no release-notes field.
- **First submission.** Expo says the default `eas submit` creates the first release on the internal track once the app exists in the Console and EAS has a service-account key, and the app stays in draft until the store listing and setup tasks are done. It also offers a manual first upload, or `releaseStatus: draft` ([Expo, Submit to Google Play](https://docs.expo.dev/submit/android/); [manual guide](https://docs.expo.dev/submit/android-manual/)). Because the schema default is `completed`, set `draft` explicitly for the first upload.
- **Key storage.** Expo stores the Google service-account key on its servers, encrypted at rest with KMS, and reuses it for later submissions ([Expo, app-signing security](https://docs.expo.dev/app-signing/security)). Upload it with `eas credentials --platform android` or the dashboard. An agent running `eas submit` therefore never needs the JSON file. EAS keeps a separate Google key type for FCM V1 push ([`AssignGoogleServiceAccountKeyForFcmV1.ts`](https://github.com/expo/eas-cli/blob/main/packages/eas-cli/src/credentials/android/actions/AssignGoogleServiceAccountKeyForFcmV1.ts)). This app uses FCM, so do not reuse the push key for Play submission.
- **Cannot do.** Listing text, screenshots and graphics ([EAS Metadata](https://docs.expo.dev/eas/metadata/) says Google Play listings are "not implemented"), per-language release notes, testers, tracks beyond the five fields above, changing a rollout fraction after submit.
- **EAS Workflows.** A `submit` job (params `build_id`, `profile`) and a `require-approval` job exist, and workflows can be started by `workflow_dispatch`, `push`, `pull_request` or `schedule` ([Expo, workflow syntax](https://docs.expo.dev/eas/workflows/syntax/)). That gives an approval gate between build and submit without any new CI.
- **Auth for agents.** `EXPO_TOKEN` (personal or robot-user access token); the project must already be linked ([Expo, programmatic access](https://docs.expo.dev/accounts/programmatic-access/)). Whether robot users need a paid plan is not stated on that page (unverified).
- **Versions.** The app's `cli.version` is `>= 15.0.0`. The npm `latest` is 24.10.0. Run it without a global install: `pnpm dlx eas-cli@24.10.0 ...`.

### fastlane `supply` (`upload_to_play_store`)

- **What it does.** Uploads AAB/APK, metadata, images and screenshots, changelogs, mapping files, and updates tracks. Options verified in source ([`supply/lib/supply/options.rb`](https://github.com/fastlane/fastlane/blob/master/supply/lib/supply/options.rb), docs: [upload_to_play_store](https://docs.fastlane.tools/actions/upload_to_play_store/)): `track`, `track_promote_to`, `track_promote_release_status`, `rollout` (greater than 0, at most 1), `release_status` (`completed`, `draft`, `halted`, `inProgress`), `version_code`, `metadata_path`, `skip_upload_*`, `validate_only`, `changes_not_sent_for_review`, `json_key` / `json_key_data` (env `SUPPLY_JSON_KEY`, `SUPPLY_JSON_KEY_DATA`; a service-account, Application Default or Workload Identity file is accepted).
- **Metadata layout.** `fastlane/metadata/android/<locale>/{title,short_description,full_description,video}.txt`, `images/{icon,featureGraphic,...}`, `images/phoneScreenshots/`, `changelogs/<versionCode>.txt` with `default.txt` as fallback ([`supply.rb`](https://github.com/fastlane/fastlane/blob/master/supply/lib/supply.rb), [`uploader.rb`](https://github.com/fastlane/fastlane/blob/master/supply/lib/supply/uploader.rb); [fastlane supply docs](https://docs.fastlane.tools/actions/supply/)). `fastlane supply init` downloads the current listing into that layout, which is how the founder's first hand-typed listing becomes repo content.
- **Cannot do.** No code path in `client.rb` or `uploader.rb` touches testers, reviews, in-app products or country availability (checked on `master`, 2026-10-05). It never sets `changesInReviewBehavior`, so every commit uses Google's default, which cancels changes in review and resubmits (see the API section). It cannot create the app. fastlane's own setup page says supply needs at least one successful upload before it can initialize ([fastlane, Android setup](https://docs.fastlane.tools/getting-started/android/setup/)).
- **Promotion detail.** When `version_code` is empty, `track_promote_to` selects releases on the source track whose status equals `release_status` (default `completed`). It fails if none or more than one match. Pass `version_code` when promoting a draft.
- **Auth.** Service-account JSON, or Workload Identity Federation (fastlane's setup page lists both). Test with `fastlane run validate_play_store_json_key json_key:<path>`.
- **Maintenance.** fastlane 2.240.1 (2026-09-15), 2.240.0 (2026-09-14), 2.239.0 (2026-09-04) on [GitHub releases](https://github.com/fastlane/fastlane/releases) and [RubyGems](https://rubygems.org/gems/fastlane); MIT; about 666 open issues. Needs Ruby. macOS system Ruby is `/usr/bin/ruby` here. Use Bundler with a project-local path, or run supply on a GitHub-hosted runner, so nothing is installed globally.

### Gradle Play Publisher (GPP)

- **What it does.** `publishBundle`, `promoteArtifact`, `publishListing`, `bootstrapListing`, in-app products and subscriptions, developer contact details. Release notes live at `play/release-notes/<lang>/<track>.txt` ([GPP README](https://github.com/Triple-T/gradle-play-publisher/blob/master/README.md)).
- **Limits.** The first APK or AAB must be uploaded in the Console "because registering the app with the Play Store cannot be done using the Play Developer API" (same README). The README says "Project status: maintenance mode. Issues are ignored, but pull requests are not." Latest release v4.1.1 (2026-08-11) ([releases](https://github.com/Triple-T/gradle-play-publisher/releases)).
- **Fit.** It runs inside a Gradle project. This repo has no committed `android/` directory and EAS Build runs prebuild remotely. Adopting GPP would mean committing or regenerating a native project. **Not recommended.**

### Google Play Developer Publishing API (androidpublisher v3), direct

- **Edits workflow.** `edits.insert`, change things, `edits.validate`, `edits.commit`. One open edit per user. A new edit invalidates the old one. Any Console change, or anyone's commit, invalidates every open edit for the app. `inappproducts`, `products` and `subscriptions` methods take effect immediately without an edit ([Google, Edits](https://developers.google.com/android-publisher/edits)).
- **Resources in the reference** ([API reference](https://developers.google.com/android-publisher/api-ref/rest)): `edits.bundles.upload`, `edits.tracks.*`, `edits.listings.*`, `edits.images.*`, `edits.details.*` (contact details), `edits.testers.*`, `edits.countryavailability.get` only, `applications.dataSafety`, `reviews.*`, `inappproducts.*`, `monetization.*`, `users.*` / `grants.*`, `appsigning.enrollApp` and `rotateAppSigningKey`, `internalappsharingartifacts.*`, `generatedapks.*`. There is no app-creation method and no method for the content rating, target audience, ads, app access, government apps, financial features or account deletion declarations. (This is my reading of the resource list, not a Google statement.)
- **Bundle upload.** `POST https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/{packageName}/edits/{editId}/bundles`. Google recommends a 2-minute HTTP timeout ([bundles.upload](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.bundles/upload)).
- **Releases.** A release has `versionCodes`, `releaseNotes[]` (BCP-47 language plus text), `status` (`draft`, `inProgress`, `halted`, `completed`) and `userFraction`, which "is only allowed to be set when status is inProgress or halted" ([Track resource](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.tracks)). Release notes are limited to 500 Unicode characters per language in the Console ([Play Console Help, Prepare and roll out a release](https://support.google.com/googleplay/android-developer/answer/9859348)).
- **Commit behavior.** `changesInReviewBehavior` defaults to `CANCEL_IN_REVIEW_AND_SUBMIT`, "which will cancel the changes in review and then send all the changes for publishing". `ERROR_IF_IN_REVIEW` returns a 400 instead. `changesNotSentForReview` keeps changes out of review until they are sent from the Console ([edits.commit](https://developers.google.com/android-publisher/api-ref/rest/v3/edits/commit)). Use `ERROR_IF_IN_REVIEW` in any direct script so an agent cannot silently cancel a review in progress.
- **Testers.** The Testers resource has one field, `googleGroups[]`. "While it is possible in the Play Console UI to add testers via email lists, email lists are not supported by this resource" ([edits.testers](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.testers)). A closed test run through the API therefore needs a Google Group created outside the API.
- **Country availability.** The resource has a `get` method only ([edits.countryavailability](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.countryavailability)). Setting countries is a Console task.
- **Data safety.** `POST .../applications/{packageName}/dataSafety` with a `safetyLabels` field holding the CSV contents ([applications.dataSafety](https://developers.google.com/android-publisher/api-ref/rest/v3/applications/dataSafety)). Google's Data safety help page also describes a CSV export/import in the Console ([Data safety help](https://support.google.com/googleplay/android-developer/answer/10787469)). The API page does not say whether a call replaces or merges prior answers (unverified).
- **Play App Signing.** `appsigning.enrollApp` is "strictly for enterprise organizations" that bring their own Cloud KMS key. Normal enrolment is not an API call ([enrollApp](https://developers.google.com/android-publisher/api-ref/rest/v3/appsigning/enrollApp)).
- **Reviews.** Only reviews created or modified in the last week are returned. Quotas: 200 GETs an hour and 2,000 POSTs a day per app. Reply text is capped at 350 characters ([Reply to reviews](https://developers.google.com/android-publisher/reply-to-reviews)). Overall quota: 3,000 queries a minute per bucket ([Quotas](https://developers.google.com/android-publisher/quotas)).
- **Calling it.** There is no `gcloud` Play command: the `gcloud` reference index (144 top-level groups, fetched 2026-10-05) has no Play or publishing group ([gcloud reference](https://docs.cloud.google.com/sdk/gcloud/reference)). Use the Node client (`@googleapis/androidpublisher` 42.2.0, `google-auth-library` 11.1.0 on npm) or plain `curl` with a bearer token whose scope is `https://www.googleapis.com/auth/androidpublisher` ([Authorization](https://developers.google.com/android-publisher/authorization)). I did not verify how to mint a Play-scoped token with `gcloud auth print-access-token`, so the sketch below uses the Node client.

### Google Play Developer Reporting API (vitals, crashes)

- Service `https://playdeveloperreporting.googleapis.com`, versions **v1beta1** and v1alpha1. Methods include `vitals.crashrate.query`, `vitals.anrrate.query`, `vitals.slowstartrate.query`, `vitals.slowrenderingrate.query`, `vitals.errors.counts.query`, `errors.reports.search`, `errors.issues.search`, `anomalies.list`, `apps.search` ([reference](https://developers.google.com/play/developer/reporting/reference/rest)).
- Enable the API in Cloud, use a service account, and grant it the least Console permission each metric set needs ([getting started](https://developers.google.com/play/developer/reporting/overview)). The OAuth scope is `https://www.googleapis.com/auth/playdeveloperreporting` (from the Go client package listing; not on the pages I fetched).
- It is read-only and still beta, so it suits a post-release check script, not a gate. [#602](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/602) and [#608](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/608) place monitoring after the reviewer submission. The first release needs none of it.

### Official Google CLI and community CLIs

- **Google official: none for Play publishing.** The Android CLI (`android`, 0.7 in April 2026, stable 1.0 at Google I/O in May 2026, latest 1.0.16500706 in October 2026) lists `auth`, `create`, `device`, `docs`, `emulator`, `install`, `run`, `screen`, `sdk`, `skills`, `studio` and `update`. It has no Play Console or Play Developer API command ([overview](https://developer.android.com/tools/agents/android-cli), [release notes](https://developer.android.com/tools/agents/android-cli/release-notes)). The Play Developer APIs page lists REST APIs and client libraries only ([Google Play Developer APIs](https://developer.android.com/google/play/developer-api)).
- **`gplay`** ([tamtom/play-console-cli](https://github.com/tamtom/play-console-cli)): MIT, created 2026-02-05, v1.0.0 on 2026-09-26, 256 stars, 5 open issues, last push 2026-10-05. Single Go binary, JSON output, `--dry-run` on writes, `gplay preflight --file app.aab` for offline manifest checks. Its own README says "Initial public-app setup, first upload, ordinary Google-managed Play App Signing enrollment, and legal declarations still require a manual Play Console handoff", and its [policy doc](https://github.com/tamtom/play-console-cli/blob/main/docs/policy-safe-automation.md) says it uses no private Console endpoints and no browser automation. Cautions: `gplay setup --auto` installs `gcloud` and logs into Google Cloud, the documented installer is `curl ... | bash`, and it prints update and GitHub-star suggestions.
- **`gpc`** ([yasserstudio/gpc](https://github.com/yasserstudio/gpc)): MIT, created 2026-03-06, v1.0.0-rc.1 on 2026-09-29, 86 stars. Node or standalone binary. Includes `gpc watch --on-breach halt`, which halts a rollout on a crash-rate breach. Release candidate, not stable.
- **Others.** [Vacxe/google-play-cli](https://github.com/Vacxe/google-play-cli): last release 0.5.0 on 2025-02-13. [DIEGOHORVATTI/playpub](https://github.com/DIEGOHORVATTI/playpub): created 2026-09-11, 0 stars. [OrellBuehler/play-console-mcp](https://github.com/OrellBuehler/play-console-mcp): created 2026-08-13, 1 star. Not suitable for a release path.
- **Assessment.** The two main ones are real and documented, and their boundary statements match Google's reference. They are also months old and single-maintainer. They would hold a key that can publish to production. I read their READMEs and one policy doc only, not their source. If adopted later, pin an exact version and checksum and read the code that touches credentials.

## Authentication and key handling

1. **Enable the API.** In a Google Cloud project, enable "Google Play Android Developer API" (and later "Google Play Developer Reporting API") ([Getting started](https://developers.google.com/android-publisher/getting_started), [Reporting getting started](https://developers.google.com/play/developer/reporting/overview)).
2. **Create the service account** in IAM and Admin. Play permissions are not Cloud IAM roles.
3. **Invite it in the Console.** Users and permissions, Invite new users, paste the service-account email, then pick app-level permissions ([Getting started](https://developers.google.com/android-publisher/getting_started); [Expo's service-account guide](https://github.com/expo/fyi/blob/main/creating-google-service-account.md)). Google does not state a propagation delay (unverified).
4. **Permissions, by name** ([Play Console Help, Add users and manage permissions](https://support.google.com/googleplay/android-developer/answer/9844686)): "View app information (read-only)"; "Release apps to testing tracks" (upload drafts, edit release notes, manage testers); "Release to production, exclude devices, and use Play App Signing"; "Manage store presence" (listing, pricing, in-app products, distribution including content rating); "Manage policy declarations" (Data safety, permission declarations); "Edit and delete draft apps"; "Reply to reviews". Expo's guide asks for a broader set that includes production release. A narrower set is untested.
5. **Keys.** Google Cloud's guidance: avoid service-account keys where an alternative exists (Workload Identity Federation, impersonation), store keys apart from source code, delete a leaked key in IAM (removing it from git is not enough), rotate, and block key creation by organization policy except where needed ([best practices](https://docs.cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys)). An organization policy may already block key creation in the founder's project.
6. **Where the key lives.** For EAS Submit: in EAS credentials, never on disk. For fastlane or scripts run locally: outside the checkout, for example `~/.config/autotm/play-ops.json` with mode 600, passed by path in `SUPPLY_JSON_KEY`. For CI: a GitHub environment secret on a protected environment, or Workload Identity Federation so no key exists. Never in git, issues, PRs or agent transcripts. The repo is public.
7. **Split by trust.** Two service accounts. `autotm-play-upload` (EAS Submit): view app information, release to testing tracks. `autotm-play-ops` (listing, promote, vitals): view app information, release to testing tracks, manage store presence. Give neither "Release to production" nor "Manage policy declarations". The founder does those in the Console.

## What still needs the Play Console UI

| Item | Why it is UI-only | Google source |
|---|---|---|
| Create the app (name, default language, app or game, free or paid, contact email, Developer Program Policies and US export law declarations, Play App Signing terms) | No app-creation method in the API. GPP and `gplay` both state this. | [Create and set up your app](https://support.google.com/googleplay/android-developer/answer/9859152); [API reference](https://developers.google.com/android-publisher/api-ref/rest) |
| First upload | Draft apps reject non-draft releases in practice (error `rolloutNotPermittedOnDraftApp`, reported in fastlane [#18293](https://github.com/fastlane/fastlane/discussions/18293) and [#29514](https://github.com/fastlane/fastlane/discussions/29514)). Google's reference does not document this. Treat the first upload as manual. | [GPP README](https://github.com/Triple-T/gradle-play-publisher/blob/master/README.md); [fastlane setup](https://docs.fastlane.tools/getting-started/android/setup/) |
| App content: privacy policy, ads, app access (reviewer login), target audience, content rating, government apps, financial features, account deletion, health, news | Forms on the App content page. No API methods. Data safety is the exception (next row). | [Prepare your app for review](https://support.google.com/googleplay/android-developer/answer/9859455) |
| Data safety | Console form, with CSV export and import. The API also has `applications.dataSafety` (CSV body). Include SDK data. Google does not verify accuracy and the developer is responsible. Keep the declaration with the founder (#391). | [Data safety](https://support.google.com/googleplay/android-developer/answer/10787469); [dataSafety](https://developers.google.com/android-publisher/api-ref/rest/v3/applications/dataSafety) |
| Content rating (IARC questionnaire) | Required for new apps; redo when content changes materially. No API mention. | [Content rating](https://support.google.com/googleplay/android-developer/answer/9859655) |
| Target audience and content | Needs ads, app access and privacy policy done first. Age groups from 5 and under to 18 and over. | [Target audience](https://support.google.com/googleplay/android-developer/answer/9867159) |
| Government apps declaration | A form on the App content page. The 2023-01-31 start date comes from a search-result summary of Google's help, not a page I could fetch (unverified). | [Government information apps](https://support.google.com/googleplay/android-developer/answer/9514050) |
| Financial features declaration | Every published app, including closed and open testing, must declare or certify "My app doesn't provide any financial features". | [Financial features](https://support.google.com/googleplay/android-developer/answer/13849271) |
| Account deletion URL and in-app deletion path | Declared in the Data safety form. In-app path and a working web link are both required for apps that let users create an account. | [Account deletion](https://support.google.com/googleplay/android-developer/answer/13327111) |
| App access and reviewer login instructions | Entered in Console. Demo credentials must work at all times and from any location. One-time-password flows need a bypass. | [App access](https://support.google.com/googleplay/android-developer/answer/15748846) |
| Play App Signing enrolment | New apps that upload an AAB are enrolled automatically; the Console shows the terms. The API method exists only for self-hosted Cloud KMS keys. Upload key reset is a Console request. | [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756); [enrollApp](https://developers.google.com/android-publisher/api-ref/rest/v3/appsigning/enrollApp) |
| Closed testing requirement | **Personal** accounts created after 2023-11-13 need at least 12 testers opted in continuously for 14 days, then "Apply for production" in the Dashboard (three sections; review "usually" up to seven days). Organization accounts are not covered by that article. No API method. | [Testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465) |
| Tester email lists | Console only. The API accepts Google Groups only. Internal test: up to 100 testers by email. Closed test: lists of up to 2,000, or Google Groups. | [Set up an open, closed, or internal test](https://support.google.com/googleplay/android-developer/answer/9845334); [testers](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.testers) |
| Countries and regions | Production page, Countries/regions tab. The API can read availability only. | [Distribute to specific countries](https://support.google.com/googleplay/android-developer/answer/7550024); [countryavailability](https://developers.google.com/android-publisher/api-ref/rest/v3/edits.countryavailability) |
| Pricing (free or paid) | Console, Products, App pricing. A free app cannot later become paid under the same package name. | [Set up your app's prices](https://support.google.com/googleplay/android-developer/answer/6334373) |
| Final send for review | An API commit sends changes for review unless the release is `draft` or `changesNotSentForReview` applies. Keep this a human click per #320. | [edits.commit](https://developers.google.com/android-publisher/api-ref/rest/v3/edits/commit) |

Useful Google fact: "You can start an internal test before completing app setup" ([Set up an open, closed, or internal test](https://support.google.com/googleplay/android-developer/answer/9845334)). The internal track is available for agent uploads and device tests while the founder is still filling in declarations.

Also in force from #324: new apps and updates must target API 36 from 2026-08-31 ([Target API requirement](https://support.google.com/googleplay/android-developer/answer/11926878)), and store listing graphics must show no third-party car brand logos (#350 resolution).

## Recommended setup

### Principle

Agents prepare and upload drafts. The founder owns identity, legal declarations and the final send-for-review. Production-release and policy-declaration permissions never go to an agent credential.

### Founder, once, by hand

1. **Check the account.** Confirm in Console whether it is an organization or personal account and its creation date. If personal and created after 2023-11-13, plan the 12-tester, 14-day closed test now: it gates production and cannot be scripted. Create a Google Group of testers outside the API (the API accepts groups only).
2. **Create the app.** Package `tm.auto.app`, default language, app (not game), **free** (cannot be changed to paid later).
3. **Create Cloud resources.** One project, enable the Play Android Developer API. Two service accounts (`autotm-play-upload`, `autotm-play-ops`). Prefer no key for `ops` if CI uses Workload Identity. Otherwise create a key, store it outside the repo, and rotate it.
4. **Invite both accounts** in Users and permissions, app-level, with the permission sets above.
5. **Upload the key for upload.** `cd apps/mobile && pnpm dlx eas-cli@24.10.0 credentials --platform android` and choose the Google service-account key option for submission. This is an interactive founder step.
6. **First AAB.** Either upload the `production` AAB by hand to the internal track (Expo's manual guide), or run the draft submit below. Accept the Play App Signing terms. Keep EAS as the upload-key holder (`eas credentials`).
7. **Fill the App content page** and Data safety from the repo's prepared copy (#327, #391), set countries and pricing, and complete the content rating.
8. **Privacy and deletion URLs** live and reachable first (#496).
9. **Final step:** open Publishing overview and send for review.

### Agents, after that

**`apps/mobile/eas.json`** (additions; `autoIncrement` is the missing piece):

```json
{
  "build": {
    "production": {
      "extends": "base",
      "distribution": "store",
      "environment": "production",
      "autoIncrement": true,
      "env": { "...": "unchanged" },
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "internal-draft": {
      "android": { "track": "internal", "releaseStatus": "draft" }
    },
    "internal": {
      "android": { "track": "internal", "releaseStatus": "completed" }
    }
  }
}
```

No `serviceAccountKeyPath`: the key comes from EAS credentials (Expo docs, key "will remain on Expo servers to be re-used"; the omission behavior itself is unverified until the first run). Check that `autoIncrement: true` works with `appVersionSource: remote` by reading the build log's versionCode.

```bash
cd apps/mobile
export EXPO_TOKEN=...   # robot or personal token; from the agent host's secret store, never in git
pnpm dlx eas-cli@24.10.0 build --platform android --profile production --non-interactive
pnpm dlx eas-cli@24.10.0 submit --platform android --profile internal-draft --latest --non-interactive
```

**fastlane** in `apps/mobile/fastlane/` (untested sketch). `Appfile`:

```ruby
package_name("tm.auto.app")
# Key path comes from SUPPLY_JSON_KEY, for example ~/.config/autotm/play-ops.json
```

`Fastfile`:

```ruby
default_platform(:android)

platform :android do
  desc "Push listing text, icon, feature graphic and screenshots only"
  lane :listing do
    upload_to_play_store(
      track: "internal",
      skip_upload_aab: true, skip_upload_apk: true,
      skip_upload_changelogs: true,
      metadata_path: "fastlane/metadata/android",
      validate_only: ENV["VALIDATE_ONLY"] == "1"
    )
  end

  desc "Promote one version code between tracks as a DRAFT; the founder completes it in the Console"
  lane :promote do |o|
    upload_to_play_store(
      track: o[:from] || "internal",
      track_promote_to: o[:to] || "alpha",
      track_promote_release_status: "draft",
      version_code: o[:version_code],
      skip_upload_aab: true, skip_upload_apk: true,
      skip_upload_metadata: true, skip_upload_images: true,
      skip_upload_screenshots: true, skip_upload_changelogs: true
    )
  end

  desc "Halt a staged rollout"
  lane :halt do |o|
    upload_to_play_store(
      track: o[:track] || "production",
      release_status: "halted",
      rollout: o[:rollout] || 0.01,
      version_code: o[:version_code],
      skip_upload_aab: true, skip_upload_apk: true,
      skip_upload_metadata: true, skip_upload_images: true,
      skip_upload_screenshots: true, skip_upload_changelogs: true
    )
  end
end
```

Run with Bundler and a project-local path so nothing is installed globally: `bundle config set --local path vendor/bundle && bundle install && SUPPLY_JSON_KEY=... bundle exec fastlane android listing VALIDATE_ONLY:1`. Add `vendor/bundle` to `.gitignore`. For the first listing, run `fastlane supply init` once after the founder has typed it in, so the repo starts from Google's copy.

Metadata layout (RU and EN; see "Open facts" for TK):

```
apps/mobile/fastlane/metadata/android/
  en-US/{title,short_description,full_description}.txt
  en-US/changelogs/default.txt          # max 500 characters
  en-US/images/{icon,featureGraphic}.png
  en-US/images/phoneScreenshots/1.png   # no car brand logos (#350)
  ru-RU/...                              # same shape
```

**Direct API script** for what supply cannot do (untested Node sketch, `pnpm dlx` or a dev dependency, not global):

```js
// scripts/play/set-testers.mjs  (sketch)
import { androidpublisher } from "@googleapis/androidpublisher";
import { GoogleAuth } from "google-auth-library";

const packageName = "tm.auto.app";
const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/androidpublisher"] }); // GOOGLE_APPLICATION_CREDENTIALS
const api = androidpublisher({ version: "v3", auth });

const { data: edit } = await api.edits.insert({ packageName });
await api.edits.testers.patch({
  packageName, editId: edit.id, track: "alpha",
  requestBody: { googleGroups: [process.env.TESTER_GROUP] },
});
await api.edits.validate({ packageName, editId: edit.id });
await api.edits.commit({
  packageName, editId: edit.id,
  changesInReviewBehavior: "ERROR_IF_IN_REVIEW",   // never cancel a review in progress
});
```

The same pattern covers `reviews.list`, `edits.countryavailability.get`, `edits.tracks.get` and the Reporting API crash-rate query. Keep each script read-only unless it names a write in its filename.

**Optional phase 2 (needs the ADR).** A `workflow_dispatch` workflow on `ubuntu-latest` (consistent with ADR-0073) that runs the fastlane lanes with a GitHub environment secret and required reviewers, so the founder approves each run. EAS Workflows with a `require-approval` job is the alternative for the build and submit half.

### Agent versus founder

| Task | Who |
|---|---|
| Build AAB, upload to internal (draft), bump versionCode | Agent (EAS) |
| Listing text, screenshots, RU and EN release notes | Agent writes files; fastlane pushes; founder reviews wording once |
| Promote internal to closed, set tester Google Group | Agent (draft or testing track) |
| Closed-test production access application | Founder (UI) |
| Data safety, content rating, target audience, ads, government, financial, deletion, app access | Founder; agent prepares copy and CSV in the repo |
| Countries, pricing | Founder (UI) |
| Complete a production release, send for review | Founder (UI) |
| Halt a staged rollout | Agent or founder (fastest wins); needs a credential with release permission, so decide in the ADR |
| Read reviews, vitals, track status | Agent (read-only scripts) |

### Risks

| Risk | Mitigation |
|---|---|
| A leaked service-account key can publish. The repo is public and the default key filename is not git-ignored. | Keys outside the checkout. Add `play-*.json` and `*-play-*.json` patterns. No production or declaration permissions on agent accounts. Prefer Workload Identity in CI. Rotate. |
| A console edit while an agent holds an edit voids the agent edit, and the Console change wins ([Edits](https://developers.google.com/android-publisher/edits)). | Agents retry from a fresh edit. Founder does not edit while a run is active. |
| fastlane commits cancel changes in review (default `CANCEL_IN_REVIEW_AND_SUBMIT`). | Do not run supply while a review is pending. Use the direct script with `ERROR_IF_IN_REVIEW` for anything touching review. Whether EAS Submit sets this is unverified. |
| API commit sends to review by itself. | Use `draft` releases. Founder sends. |
| versionCode reuse blocks uploads. | `autoIncrement: true`. Check the first build log. |
| Declarations are legally meaningful and Google does not verify accuracy. | Founder owns them. |
| Community CLI supply-chain and install behavior (`setup --auto`, `curl | bash`, update checks). | Not adopted for the first release. Pin and audit if adopted later. |
| EAS free plan: 15 Android builds a month, low priority, one at a time; robot-user plan unverified. | Check the real plan before relying on queue time. Keep a manual `eas build` path. |
| The Reporting API is beta. | Use for checks only. |
| Expo holds the submit key. | Accepted by the existing EAS use. Document in the ADR. Rotate by uploading a new key with `eas credentials`. |

## Open facts

- **Turkmen listing.** `tk` is not in Google's supported translation list; RU (`ru-RU`), EN (`en-US`, `en-GB`) and Turkish (`tr-TR`) are ([Play Console Help, supported languages](https://support.google.com/googleplay/android-developer/answer/3125566), HTML fetched and searched for "Turkmen" on 2026-10-05). The API accepts a BCP-47 tag but Google does not say whether it rejects an unsupported one. Unverified. Check in the Console under Manage translations before writing TK metadata. The in-app Turkmen UI is unaffected.
- **Draft-app first upload.** Only fastlane and other tools' issue trackers document that non-draft releases are refused on a draft app. Google's reference does not.
- **Review status.** I found no API method that reads whether a release is in review. The commit documentation mentions an error for "changes currently in review", so the API knows the state but does not expose a read. Unverified beyond the resource list. The Console's Publishing overview and Google's emails are the way to see it.
- **EAS Submit specifics.** Whether `changesInReviewBehavior` is set, whether a submit profile without `serviceAccountKeyPath` uses the stored key without prompts, whether robot users need a paid plan, and whether `autoIncrement` composes with `appVersionSource: remote` here.
- **Service-account propagation delay** after the Console invite: not stated in the Google pages read.
- **Account type and creation date** for the Play Console account: not in the repo. #324 and #327 already ask the operator to check.
- **`gcloud` token for the Play scope.** I did not verify a `gcloud auth print-access-token` recipe for `androidpublisher`.
- **Reporting API scope and permission names** came from a search summary and the Go package listing, not from a Google page I could fetch.
- **Community CLI source.** Read READMEs and one policy document only.
- **Sketches.** Every snippet here is untested.

## Sources

Google Play and Android (primary):

- Developer API getting started: https://developers.google.com/android-publisher/getting_started
- Authorization: https://developers.google.com/android-publisher/authorization
- Edits workflow: https://developers.google.com/android-publisher/edits
- REST reference index: https://developers.google.com/android-publisher/api-ref/rest
- `edits.commit`: https://developers.google.com/android-publisher/api-ref/rest/v3/edits/commit
- `edits.bundles.upload`: https://developers.google.com/android-publisher/api-ref/rest/v3/edits.bundles/upload
- Tracks and releases: https://developers.google.com/android-publisher/api-ref/rest/v3/edits.tracks
- Listings: https://developers.google.com/android-publisher/api-ref/rest/v3/edits.listings
- Images: https://developers.google.com/android-publisher/api-ref/rest/v3/edits.images
- Testers: https://developers.google.com/android-publisher/api-ref/rest/v3/edits.testers
- Country availability: https://developers.google.com/android-publisher/api-ref/rest/v3/edits.countryavailability
- `applications.dataSafety`: https://developers.google.com/android-publisher/api-ref/rest/v3/applications/dataSafety
- `appsigning.enrollApp`: https://developers.google.com/android-publisher/api-ref/rest/v3/appsigning/enrollApp
- Reply to reviews: https://developers.google.com/android-publisher/reply-to-reviews
- Quotas: https://developers.google.com/android-publisher/quotas
- Reporting API: https://developers.google.com/play/developer/reporting, https://developers.google.com/play/developer/reporting/overview, https://developers.google.com/play/developer/reporting/reference/rest
- Google Play Developer APIs overview: https://developer.android.com/google/play/developer-api
- Android CLI: https://developer.android.com/tools/agents/android-cli, https://developer.android.com/tools/agents/android-cli/release-notes
- Android versioning: https://developer.android.com/studio/publish/versioning
- Play Console Help: create an app https://support.google.com/googleplay/android-developer/answer/9859152; App content https://support.google.com/googleplay/android-developer/answer/9859455; Data safety https://support.google.com/googleplay/android-developer/answer/10787469; content rating https://support.google.com/googleplay/android-developer/answer/9859655; target audience https://support.google.com/googleplay/android-developer/answer/9867159; government apps https://support.google.com/googleplay/android-developer/answer/9514050; financial features https://support.google.com/googleplay/android-developer/answer/13849271; account deletion https://support.google.com/googleplay/android-developer/answer/13327111; app access https://support.google.com/googleplay/android-developer/answer/15748846; Play App Signing https://support.google.com/googleplay/android-developer/answer/9842756; testing requirements https://support.google.com/googleplay/android-developer/answer/14151465; test tracks https://support.google.com/googleplay/android-developer/answer/9845334; prepare and roll out a release https://support.google.com/googleplay/android-developer/answer/9859348; staged rollouts https://support.google.com/googleplay/android-developer/answer/6346149; country distribution https://support.google.com/googleplay/android-developer/answer/7550024; pricing https://support.google.com/googleplay/android-developer/answer/6334373; users and permissions https://support.google.com/googleplay/android-developer/answer/9844686; supported languages https://support.google.com/googleplay/android-developer/answer/3125566; target API https://support.google.com/googleplay/android-developer/answer/11926878
- Google Cloud: service-account key best practices https://docs.cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys; gcloud reference index https://docs.cloud.google.com/sdk/gcloud/reference

Expo and EAS (docs.expo.dev pages and the eas-cli repo; also read through Context7 `/websites/expo_dev` and `/expo/eas-cli`):

- Submit to Google Play: https://docs.expo.dev/submit/android/ and manual guide https://docs.expo.dev/submit/android-manual/
- `eas.json`: https://docs.expo.dev/eas/json/
- App versions: https://docs.expo.dev/build-reference/app-versions/
- Workflows syntax: https://docs.expo.dev/eas/workflows/syntax/
- EAS Metadata: https://docs.expo.dev/eas/metadata/
- Programmatic access: https://docs.expo.dev/accounts/programmatic-access/
- App signing security: https://docs.expo.dev/app-signing/security
- Pricing: https://expo.dev/pricing
- Service account guide: https://github.com/expo/fyi/blob/main/creating-google-service-account.md
- eas-cli repo and releases: https://github.com/expo/eas-cli, https://github.com/expo/eas-cli/releases; `packages/eas-json/src/submit/schema.ts` and `types.ts`

fastlane (docs and source; also read through Context7 `/websites/fastlane_tools`):

- https://docs.fastlane.tools/actions/upload_to_play_store/, https://docs.fastlane.tools/actions/supply/, https://docs.fastlane.tools/getting-started/android/setup/
- Source on `master`: `supply/lib/supply/options.rb`, `supply.rb`, `uploader.rb`, `client.rb`, `setup.rb`
- Releases: https://github.com/fastlane/fastlane/releases; RubyGems: https://rubygems.org/gems/fastlane
- Draft-app error reports: https://github.com/fastlane/fastlane/discussions/18293, https://github.com/fastlane/fastlane/discussions/29514

Gradle Play Publisher: https://github.com/Triple-T/gradle-play-publisher, https://github.com/Triple-T/gradle-play-publisher/releases

Community CLIs: https://github.com/tamtom/play-console-cli (and its `docs/policy-safe-automation.md`), https://github.com/yasserstudio/gpc, https://github.com/Vacxe/google-play-cli, https://github.com/DIEGOHORVATTI/playpub, https://github.com/OrellBuehler/play-console-mcp. Repository dates, stars and release tags come from the GitHub REST API, queried unauthenticated on 2026-10-05.

Repo files read: `apps/mobile/eas.json`, `apps/mobile/app.config.js`, `apps/mobile/package.json`, `.gitignore`, `apps/mobile/.gitignore`, [ADR-0039](../adr/0039-phased-cloud-first-hosting.md), [ADR-0046](../adr/0046-production-smoke-host-approval.md), [ADR-0051](../adr/0051-auto-ru-inspired-mobile-discovery-before-google-play-review.md), [ADR-0073](../adr/0073-ci-gates-and-release-bundles-run-on-github-hosted-runners.md), [`2026-10-02-autotm-release-plan.md`](2026-10-02-autotm-release-plan.md), [`84-launch-plan.md`](../prd/ops/84-launch-plan.md), [`issue-279-reviewer-flow-and-builds.md`](../prd/ops/evidence/issue-279-reviewer-flow-and-builds.md), [`docs/research/README.md`](README.md), issues [#320](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/320), [#324](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/324), [#327](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/327).
