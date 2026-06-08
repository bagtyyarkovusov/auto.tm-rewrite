# Sprint 8 — Private beta polish

| | |
|---|---|
| **Status** | 🟡 In progress (S8a) |
| **Phase** | 1 (MLP beta final) |
| **Milestone** | M7 — Private beta |
| **Demo audience** | First 10-50 real users |
| **Estimated time** | S8a ~1.5 weeks (remote) + S8b on-site (TM) |
| **Issues** | Parent [#186](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/186); S8a children #187–#199 |

> **Reshaped 2026-06-09.** The original S8 plan assumed the TM ops/infra track was live. It is not: the founder is remote (China) and **geo-blocked from all TM hardware** — no OTP phones, no TM SIMs, no Proxy PC, no air-gap deploy, no TLS, no domains (only the Google Play account exists). Equally, a hands-on review found the **mobile app is not product-coherent enough for even 10 testers** (no logout, no Profile/Settings — the Services tab is five dead tiles, English-only past the auth screens, a dead Favorites tab). So S8 is **split**:
> - **S8a — remote product-completeness** (do now, verifiable on a local dev stack): mobile completeness + compliance code.
> - **S8b — on-site beta cutover** (deferred to TM): ops, distribution, real OTP, the actual invites.
>
> This is a sequencing reshape of a still-`⚪ Pending` sprint, permitted by [ADR-0020](../../adr/0020-document-hierarchy-and-mutability.md). The S8 product capability (a safe private beta) is unchanged. Two design decisions surfaced during the reshape are captured as [ADR-0031](../../adr/0031-mobile-i18n.md) (mobile i18n) and [ADR-0032](../../adr/0032-account-deletion-grace-period.md) (account deletion). **Favorites** is pulled from the post-MLP bet table into S8a (it removes two dead surfaces and matches the beta-window plan) — capability move recorded here per ADR-0020; no separate ADR needed.

## Goal

Make the small marketplace loop **product-complete and beta-safe**, doing every piece that can be done remotely first. This is the circuit-breaker sprint for the MLP: fix the obvious UX, reliability, legal, i18n, account, seed-data, and verification gaps so that — once on-site infra exists — inviting real users is the only step left.

## User capability (the demo line)

> "A real seller can post a car, log in **and out**, manage their account in **their own language**, a real buyer can find and contact them, and the team can moderate — and nothing in the app looks broken or dead."

## Bounded contexts touched

- **Primary**: `apps/mobile` (product-completeness), `identity/` (account deletion), `listings/` (favorites, deletion archive)
- **Supporting**: `apps/web` (legal pages), `packages/db` (deletion + favorites migration, seed), ops/legal docs

---

## S8a — remote product-completeness (active)

Everything below is verifiable on a local dev stack from anywhere. **Build order matters**: the i18n foundation lands first so every new screen is built localized, not retrofitted.

| ID | Slice | Primary areas | Depends on | Verify |
|---|---|---|---|---|
| **0** | **S7 closeout** — commit in-flight admin fixes + `clear-otp-rate-limit.ts`; close parent issue #175 | docs, db | — | trivial |
| **A4a** | **i18n foundation** — react-i18next + zustand locale store + `AsyncStorage` persistence + in-app LocaleSwitcher + `Accept-Language` from store + retire `?locale=` params + **fix the `cities` query key** + Hermes `Intl` polyfills. See [ADR-0031](../../adr/0031-mobile-i18n.md). | mobile, api | 0 | 🧑 sim |
| **A1** | **Profile screen** — wire the dead Profile tile; extend `useViewer`/`GetMe` to surface phone + identity | mobile, api | A4a | 🧑 sim |
| **A2** | **Settings + Logout** — Settings screen: **logout**, language switch, delete-account entry | mobile | A4a | 🧑 sim |
| **A3** | **Account deletion (30-day grace)** — replace the S2 hard-delete; tombstone-retain + recovery. See [ADR-0032](../../adr/0032-account-deletion-grace-period.md). | api, db, mobile, worker | A2 | 🤖 AFK + 🧑 |
| **A5** | **Favorites** — API (favorite/unfavorite/list) + wire the existing disabled detail button + the stub tab | mobile, api | A4a | 🤖 AFK + 🧑 |
| **A4b + A6** | **String migration + broken-UI sweep** — migrate existing screens' English → keys; hide/route the Garage/Blog/About dead tiles; finish the feed/search/chat/detail/edit audit | mobile | A4a | 🧑 sim |
| **A7** | **Top-5 errors + accessibility** — plain copy + retry for top MLP errors; tap-target/contrast pass | mobile, api | A4a | 🧑 sim |
| **B1-legal** | **RU/TK/EN legal pages** — privacy + terms (needed for store review) | web | — | 🤖 AFK |
| **C1** | **Full MLP e2e + admin moderation smoke** — Testcontainers; finishes the admin browser walkthrough already in flight | api, verify | A1–A7 | 🧑 CI |
| **C2** | **Docs drift closeout** — roadmap, CONTEXT, deferred-feature ledger reconcile | docs | all | — |

**If time (not tester-blocking for a 10-50 cohort):** public web landing + listing-detail OG (deferred from S4 #95); seed-data depth; top-5 MLP query index gate.

**Verify legend:** 🧑 sim = needs the founder's Expo Go simulator (Sandcastle is blind to UI). 🤖 AFK = cleanly Sandcastle-able (Testcontainers/static). 🧑 CI = e2e/human gate.

### Parallel de-risk (remote, independent)

- **China-SIM `phone-agent` test** — validate the Kotlin SMS-read pipeline against a real (China) SIM before depending on scarce TM SIMs.

---

## S8b — on-site beta cutover (deferred to TM)

Blocked from China; resume when the founder is on-site with hardware.

- OTP phones + real TM SIMs (real OTP delivery) · TM Proxy PC (UPS, dedicated) · ≥1 proven air-gap deploy to TM servers · TLS certs (Let's Encrypt via Proxy PC) + domains (`auto.tm` + `api/admin/media` subdomains)
- Ops drills in prod-like infra: Telegram alert delivery, rollback, backup restore, feature-pause flags, bad-moderation reversal
- Real **TestFlight / Play internal-track** distribution + APK fallback to physical devices ([ADR-0029](../../adr/0029-self-hosted-ota-air-gap-delivery.md))
- Monitoring/runbook live; beta responder owner for first 24h
- **The actual 10-50 invites**

---

## Locked design decisions (S8a)

- **i18n** ([ADR-0031](../../adr/0031-mobile-i18n.md)): react-i18next · device-detect → **RU** fallback · zustand locale store + `AsyncStorage` · **`Accept-Language` from store** (retire `?locale=`, **keep locale in query keys**, fix `cities`) · per-feature namespaces · boundary = UI chrome + catalog localized, **user content never auto-translated**.
- **Account deletion** ([ADR-0032](../../adr/0032-account-deletion-grace-period.md)): 30-day grace via `User.deletionScheduledAt` · revoke sessions + archive listings (tagged `archivedByDeletion`) on request · recovery = **prompt + auto-republish** on OTP login during grace (survives `SIGNUPS_ENABLED=false`) · day-30 **tombstone-retain** purge by a daily `apps/worker` job (keep User row, null PII, prune private tables, retain listings/conversations/messages/reports re-attributed) · existing cascades stay as a true-erasure safety net.

---

## Acceptance criteria (DoD)

**S8a (remote):**
- [ ] i18n: signed-in app fully localized TK/RU/EN; fresh install device-detects → RU fallback; locale switch refetches catalog (incl. cities) and persists across launches
- [ ] Account surface reachable: Profile (shows the signed-in identity) + Settings with working **logout** and language switch
- [ ] Account deletion matches [ADR-0032](../../adr/0032-account-deletion-grace-period.md): `DELETE /api/v1/me` starts a 30-day grace, revokes sessions, archives listings, allows prompt+auto-republish recovery by login, tombstone-retains content with deleted-user attribution, and a worker job purges PII at day 30; the S2 hard-delete cascade is gone from the user path
- [ ] Favorites works: favorite/unfavorite from detail + feed, real Favorites list; no dead Favorites surfaces remain
- [ ] No dead/tappable-but-inert UI: Garage/Blog/About tiles hidden or routed; broken-UI sweep of feed/search/chat/detail/edit done
- [ ] Top 5 user-facing errors have plain copy + retry; mobile tap targets + obvious contrast pass a focused accessibility check
- [ ] Legal pages exist in RU/TK/EN: privacy + terms
- [ ] End-to-end happy path passes locally: login → create listing → browse/search → contact seller → seller replies; admin reports/moderation smoke with beta-like data
- [ ] Docs drift audit passes (see closeout below); deferred-feature ledger reviewed; Favorites move recorded in roadmap

**S8b (on-site, gates the invites):**
- [ ] Internal beta distribution works (TestFlight/Play internal track or documented equivalent) on physical devices
- [ ] Real OTP delivery via TM phones/SIMs; reachable beta surfaces over TLS
- [ ] Monitoring/runbook covers API/DB/SMS-OTP/media/admin health + the 24h beta responder owner
- [ ] Ops drills pass in prod-like infra: alert delivery, rollback, backup restore, feature-pause flags, bad-moderation reversal
- [ ] `docs/prd/03-roadmap.md` marks Phase 1 MLP beta complete when S8 closes; Phase 1 retro captures the next 1-3 post-MLP bets

## Tests required

- **API e2e**: MLP happy path across identity, listings, contact, moderation; account deletion starts grace (not hard delete), recovery republishes, day-30 purge tombstones + retains content
- **Mobile smoke**: login, logout, create listing, search, contact, locale switch, delete-account flow
- **Web smoke**: legal pages render RU/TK/EN
- **Admin smoke**: report, ban, audit log
- **Manual beta checklist (S8b)**: distribution, real OTP, monitoring, alert/rollback/restore/feature-pause/moderation drills

## Documentation drift closeout

The final S8 closeout (C2) runs this before Phase 1 is marked complete:

- **Roadmap**: S1-S8 statuses, M1-M7 state, post-MLP bet table current (Favorites removed from the bet table — now shipped).
- **Deferred-feature ledger**: every remaining deferred feature has a PRD/flow home + a trigger to build; no orphan future-sprint file.
- **Sprint docs**: S7 + S8 child outcomes reconcile with the sprint DoDs; drift captured in the retro, not by rewriting locked files.
- **CONTEXT docs**: every implementation PR that changed a domain invariant updated the local `CONTEXT.md` (i18n, account-deletion grace, favorites, tombstone-user state); planned items clearly marked.
- **CONTEXT-MAP**: any new module/context indexed.
- **ADRs**: 0031 + 0032 merged; any further surprising trade-off has an ADR or an explicit "no ADR needed" note.

If the checklist finds a beta-safety gap, fix it before invites. Post-MLP planning work parks in the roadmap bet table.

## Files this sprint creates / touches

```
apps/mobile/                              # i18n, account surface, favorites, broken-UI sweep
apps/api/src/modules/identity/            # account deletion grace + recovery
apps/api/src/modules/listings/            # favorites, deletion archive tagging
apps/worker/                              # day-30 purge job
apps/web/src/app/[locale]/                # legal pages (RU/TK/EN)
packages/db/prisma/schema.prisma          # deletionScheduledAt, archivedByDeletion, Favorite wiring
docs/prd/ops/83-legal.md, 84-launch-plan.md, 85-launch-analytics-plan.md
```

## References

- **ADRs**: [ADR-0027](../../adr/0027-mlp-beta-scope.md) (MLP scope), [ADR-0031](../../adr/0031-mobile-i18n.md) (mobile i18n), [ADR-0032](../../adr/0032-account-deletion-grace-period.md) (account deletion), [ADR-0029](../../adr/0029-self-hosted-ota-air-gap-delivery.md) (OTA delivery), [ADR-0020](../../adr/0020-document-hierarchy-and-mutability.md) (doc mutability)
- **Roadmap**: [`../03-roadmap.md`](../03-roadmap.md) · **Phase scope**: [`../02-phases.md`](../02-phases.md)
- **Ops PRDs**: [`../ops/83-legal.md`](../ops/83-legal.md), [`../ops/84-launch-plan.md`](../ops/84-launch-plan.md)

## Previous-sprint dependencies

- S1-S7 — this sprint verifies and polishes the complete MLP loop

## No-gos

- No blog · no saved searches · no notification categories · no dealership showroom · no Garage · no rich chat · no video pipeline · no broad app-store marketing launch
- (Favorites is **in** scope this sprint — pulled from post-MLP per the reshape above.)

## Definition of "MLP beta complete"

- [ ] S8a shipped: app is product-coherent, localized, with a working account surface + deletion + favorites
- [ ] S8b shipped on-site: distribution + real OTP + monitoring + drills
- [ ] M1-M7 all 🟢 in `03-roadmap.md`
- [ ] First 10-50 users can be invited; the team can observe, moderate, and support them
- [ ] A Phase 1 retro lists the next 1-3 shaped post-MLP bets
