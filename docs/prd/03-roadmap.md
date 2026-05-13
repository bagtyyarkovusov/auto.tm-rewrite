# 03 — Roadmap

> **The "where are we?" file.** Open this first in every session. It tells you which sprint is current, what shipped before it, and what comes next.
>
> Sister docs:
> - **`GRILL-OUTCOME.md`** — locked decisions (what we agreed to build)
> - **`02-phases.md`** — scope per phase (what's in / out of each phase)
> - **`sprints/sprint-NN-<name>.md`** — per-sprint detail (DoD, files, tests, references)
> - **This file (`03-roadmap.md`)** — the cross-sprint trajectory + current pointer

---

## Current sprint

| | |
|---|---|
| **Sprint** | S1 — Scaffold |
| **Status** | 🟡 In progress |
| **Phase** | 1 (Marketplace MVP) |
| **Plan file** | *(see sprint doc below — the detailed plan lives in `sprints/sprint-01-scaffold.md`)* |
| **Sprint doc** | [`sprints/sprint-01-scaffold.md`](sprints/sprint-01-scaffold.md) |
| **Milestone** | M1 — Hello stack |

> **Agents:** update this block at the start of every sprint. Sprint N's first PR sets `Status` to 🟡 in progress; the sprint-closing PR sets the previous sprint to 🟢 shipped and bumps Current to N+1.

---

## Three phases at a glance

| Phase | Wall-clock | Sprints | Headline outcome |
|---|---|---|---|
| **Phase 1** — Marketplace MVP | ~8-10 weeks | S1-S10 | Buyers find listings → contact sellers; sellers post; admins moderate; soft launch ready |
| **Phase 2** — Trust Layer | ~6-8 weeks | S11-S16 (TBD) | AutoTM-staffed inspections, 3-tier badge on listings, downloadable PDF reports |
| **Phase 3** — Premium polish | ~4-6 weeks | S17-S20 (TBD) | 360° orbit photos, listing comparisons, performance + UX polish before scaling marketing |

Full scope per phase: [`02-phases.md`](02-phases.md). Anti-goals (what we explicitly will NOT build): [`00-vision.md`](00-vision.md#anti-goals-things-we-explicitly-will-not-build).

---

## Phase 1 — Sprint status

| # | Sprint | Status | Started | Shipped | Milestone | Demo audience |
|---|---|---|---|---|---|---|
| S1 | [Scaffold](sprints/sprint-01-scaffold.md) | ⚪ Planned | — | — | M1 | Nobody — confirms rails |
| S2 | [Identity (OTP)](sprints/sprint-02-identity.md) | ⚪ Pending | — | — | M2 | Tiny internal group |
| S3 | [Catalog](sprints/sprint-03-catalog.md) | ⚪ Pending | — | — | — | Internal |
| S4 | [Listings CRUD](sprints/sprint-04-listings-crud.md) | ⚪ Pending | — | — | M3 | Internal group |
| S5 | [Listings UX](sprints/sprint-05-listings-ux.md) | ⚪ Pending | — | — | M4 | 10-20 beta testers (mocked data) |
| S6 | [Garage + Dealership](sprints/sprint-06-garage-dealership.md) | ⚪ Pending | — | — | — | Beta testers |
| S7 | [Conversations (chat)](sprints/sprint-07-conversations.md) | ⚪ Pending | — | — | M5 | Beta testers (real listings) |
| S8 | [Notifications + match](sprints/sprint-08-notifications.md) | ⚪ Pending | — | — | M6 | Beta testers (full loop) |
| S9 | [Admin dashboard](sprints/sprint-09-admin.md) | ⚪ Pending | — | — | M7 | Go-to-market planning |
| S10 | [Polish + app-store](sprints/sprint-10-polish.md) | ⚪ Pending | — | — | M8 | TM market (soft launch) |

**Legend:** ⚪ Pending · 🟡 In progress · 🟢 Shipped · 🔴 Blocked

---

## Phase 2 — Sprint roster (placeholder)

These get fleshed out into individual `sprint-NN-*.md` files during the Phase 1 launch retro. Until then they're rows here.

| # | Sprint (tentative) | Bounded context | Notes |
|---|---|---|---|
| S11 | Reports — domain + admin workflow | `reports/` | Rubric editor + inspection-recording UI |
| S12 | Reports — tier computation + listing badge | `reports/` + `listings/` | Score → tier mapping; badge component |
| S13 | Reports — PDF export | `reports/` | Puppeteer + HTML template + MinIO storage |
| S14 | Reports — pro media attribution | `admin/` + `listings/` | "Photos by AutoTM" credit on staff-uploaded media |
| S15 | Tier filter + discovery surfacing | `listings/` + mobile/web | "Trusted by AutoTM" filter chip |
| S16 | Phase 2 polish | various | App-store update; pricing-tier UX |

**Operational prereqs** (must finish before S11 starts, per `02-phases.md`):
- Rubric signed off by a real mechanic
- 1-2 inspectors hired + trained
- Sample inspections done as QC
- Pricing model decided (free / paid / subsidized)

---

## Phase 3 — Sprint roster (placeholder)

Highly flexible — content depends on launch-data learnings.

| # | Sprint (tentative) | Bounded context | Notes |
|---|---|---|---|
| S17 | 360° orbit photos | `listings/` + mobile/web | Walk-around capture flow + viewer |
| S18 | Comparisons | mobile/web | Side-by-side compare 2-3 listings |
| S19 | Sort + ranking refinements | `listings/` | Beyond pure recency |
| S20 | Onboarding + perf polish | mobile + global | First-run tutorial; image variant tuning |

---

## Milestones (visible to non-engineers)

| Milestone | After sprint | Demo-able to |
|---|---|---|
| **M1** Hello stack | S1 | Nobody — confirms the rails |
| **M2** I can log in | S2 | Tiny internal group |
| **M3** I can browse cars | S4 | Internal group |
| **M4** I can search + save | S5 | 10-20 beta testers (mocked data) |
| **M5** I can contact the seller | S7 | Beta testers (real listings, real chats) |
| **M6** I get notified | S8 | Beta testers (full notifications loop) |
| **M7** Admins run the place | S9 | Go-to-market planning |
| **M8** Soft launch | S10 | TM beta market |

---

## Sprint dependencies (don't reorder lightly)

```
S1 ────► S2 ────► S3 ─┬─► S4 ────► S5 ─┬─► S7 ────► S8 ─┐
                      │                 │              ├─► S9 ────► S10
                      └─► S6 ───────────┘              │
                                                       │
                              (catalog data feeds       │
                               filter UI in S5)         │
                                                       │
                              (chat needs identity      │
                               + listings detail)       │
```

- **S2 unlocks everything else** — no use-case is reachable until auth works.
- **S3 (Catalog) is a hard prereq for S4 (Listings)** — you can't create a listing without picking a brand/model.
- **S4 unblocks S5, S6, S7.**
- **S5 + S7 → S8** — saved-search match needs both the saved-search infra (S5) and the notification primitive proven by chat-push (S7).
- **S9 (Admin)** can technically start any time after S2 but is most useful late (it moderates content that doesn't exist yet in early sprints).
- **S10 is always last** — landing/blog/legal/app-store work polishes everything before launch.

If a sprint slips, slide all downstream rows in the table by the same delta; don't try to parallelize unless you've explicitly broken the dependency.

---

## How to update this file

Once per sprint:

1. **Start of sprint N**: open `sprints/sprint-NN-<name>.md`; set the Current Sprint block at the top of this file to N + status 🟡; the row for N in the table to 🟡 with `Started` = today's date.

2. **End of sprint N**: set the row for N to 🟢 with `Shipped` = today's date. Bump Current to N+1 with status ⚪ Pending. Add a one-line note under "Shipped log" below describing what landed (the demo line for the milestone, if any).

3. **If scope shifts between sprints**: follow the "How to propose a scope change" checklist in [`02-phases.md`](02-phases.md). Update the affected sprint file's DoD; do **not** silently move work.

4. **Never edit the milestones table** without a charter revision (since milestones are externally communicated).

## Shipped log

> One-line entries, newest first. Empty until the first sprint closes.

- *(none yet)*

---

## Cross-references

- **Feature PRDs** — [`features/`](features/) — one per Phase 1 feature
- **End-to-end flows** — [`flows/`](flows/) — six user journeys
- **UI / design system** — [`ui/`](ui/)
- **Ops** — [`ops/`](ops/) — deploy / monitoring / launch
- **Decision log** — [`../adr/`](../adr/)
- **Domain state** — [`../../CONTEXT-MAP.md`](../../CONTEXT-MAP.md) (always-current per-context invariants)
