# Reported Profile Photo removal — issue #739

UI captures refreshed on 2026-10-08 from the production build after the single
review fix round (`fa570f1c`).
The issue supplies the UI delta; the existing Russian report cards and action
forms supply the layout and tokens. This is a local browser proof with a fixture
API and synthetic Profile Photo, not a staging or production moderation run.

The original standalone smoke copied static/public assets by hand. It proved
browser behavior but **did not prove the deployed image layout**: the reviewed
Dockerfile omitted `public`, so Assigned Avatars would return 404. Those original
screenshots used a 1024 × 900 viewport and a local fixture API/media origin.

The single fix round adds the missing runtime `public` COPY. The reproducible
check `node apps/admin/scripts/verify-standalone-assets.mjs` materializes only
that Dockerfile's runtime `COPY --from=build` entries into a fresh `/tmp` layout,
starts its `apps/admin/server.js`, and fetches `/assigned-avatars/3.svg`. It failed
with HTTP 404 at red checkpoint `176c4693` and passes with HTTP 200 and SVG content
after the public COPY (`3f893670`).
No Docker build or additional asset copying is used by this check.

The same check requests a report against a local fixture API and asserts that
its thumbnail URL uses the admin service's runtime media origin. Reproduce the
build-versus-runtime proof with:

```sh
NEXT_PUBLIC_MINIO_PUBLIC_URL=http://127.0.0.1:17499 pnpm --filter @auto-tm/admin build
node apps/admin/scripts/verify-standalone-assets.mjs
```

The server starts with a different runtime value (`https://runtime-media.example.test`).
The built report assertion failed at `25cc4439`: Next.js had inlined the build
value. It passes after `fa570f1c` uses `Reflect.get` on the server environment.
The documented `process.env` alias still inlined under Turbopack 16.2.6; the
artifact test, rather than an assumption about source syntax, establishes this
runtime behavior. The Chrome captures run that same Dockerfile layout with
runtime media origin `http://127.0.0.1:17490`; the loaded photo URL is
`/listing-photos/pending/u1-photo/thumbnail.jpg`, matching mobile's generated
thumbnail variant. A second server from the same build with an empty runtime
origin shows the Russian unavailable note and hides photo removal.

The Assigned Avatar rule is local to the report visit: show the restored mark
only when that visit previously displayed a Profile Photo and a fresh read no
longer has one. A fresh no-photo report, including one actioned by suspension,
shows no extra avatar. Reloading an already-actioned report also shows no extra
avatar. This preserves the no-photo criterion while providing removal feedback.
Failed removal keeps its Russian alert visible without an automatic refresh;
stale-report text tells the moderator to reload manually.

| Issue criterion / state | Captured UI and observed behavior |
|---|---|
| 1: Profile Photo set | [Current photo and removal control](photo-set.png); thumbnail image loaded successfully from the runtime media origin. |
| 1: Only Assigned Avatar | [No extra photo block or removal control](no-photo.png). |
| 2: Confirmation | [Reason and explicit confirmation/cancel controls](confirmation.png). Clicking the initial button did not remove the photo. |
| 2: Success | [Assigned Avatar and actioned report](success.png); photo and action controls gone after server refresh. |
| 3: Failure | [Error with original photo and pending report](failure.png). |
| 3: Flag disabled | [Photo readable, moderation actions hidden](disabled.png). |
| 3: Staff read forbidden | [Error, no removal control](forbidden.png). |
| Missing media origin | [Russian unavailable note](unavailable.png); no photo image or removal control. |
| Fresh actioned report without photo | [No extra Assigned Avatar](actioned-no-photo.png). |
| Stale report conflict | [Localized error remains visible](stale-error.png); fixture report became actioned, but the failed action caused no additional report read or refresh. |
| Pending request | [Input, confirmation and cancel disabled](pending.png); completion then refreshed to actioned. |

The actual Next.js server action issued exactly one request to the fixture:

```text
POST /api/v1/admin/users/u1/remove-photo
{"reason":"Неприемлемое фото","reportId":"r1"}
```

Rendered Vitest tests separately cover photo/no-photo, confirmation, cancellation,
reason validation, success, errors, feature-disabled and forbidden reads,
config failure, resolved reports, and ineligible targets. The focused suite passed
62 admin tests (19 report-page, 17 removal-form, 25 actions, 1 audit) and 13 API
report-detail tests. The full admin unit suite passes 115 tests. Red evidence remains in pushed
commits `398529ff` and `ac80d9d5`, and the PR Execution state records commands and
failure reasons, including fix-round reds `176c4693`, `ee0f2dd9`, `59100d97`,
`2b84afe1`, `6bfe6bea`, and `25cc4439`. The failed-removal page test now reads
and renders a fresh report before asserting unchanged photo/status; deliberate
reread mutations of either field fail that test (mutations were not committed).

The removal route and transaction are unchanged. The report-detail reader now
exposes optional `avatarKey` and `avatarIndex` fields that its Identity read
already had; these are the additive read-contract exception to criterion 6's
“no API change” wording. No schema migration or live configuration changed.
