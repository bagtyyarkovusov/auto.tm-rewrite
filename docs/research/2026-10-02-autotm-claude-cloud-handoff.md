# Claude Code desktop/cloud handoff, 2 October 2026

Repository: https://github.com/bagtyyarkovusov/auto.tm-rewrite

Release map: [#320](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/320). Audit/handoff task: [#535](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/535). Durable documentation PR: [#539](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/539), branch `agent/issue-535`. This file is a dated recovery baseline. Re-read GitHub before dispatch; it is not a competing live ledger.

## Paste this into Claude Code desktop with Cloud selected

```text
Continue AutoTM orchestration toward the first reviewer-only Android release.
Repository: bagtyyarkovusov/auto.tm-rewrite.
Read docs/research/2026-10-02-autotm-claude-cloud-handoff.md and the linked release decision map. If these files are not on main yet, read them from the pushed agent/issue-535 branch / PR #539. Keep issue writers based on the current approved main or their existing reservation, not on a documentation branch by accident.

First reconcile live #320, #353/#354 decisions, open PR Execution state/comments/checks and agent/issue-* reservations. Preserve existing integration and writing ownership. Start by inspecting #503/#516/#517/#518 and PRs #529/#532/#534, which were already owned at the handoff baseline. No audit action stopped or transferred those writers. Do not duplicate them or infer that a missing assignee means an issue is free.

Continue the founder's existing ordered queues under .claude/skills/run-queue/SKILL.md. Cabinet: #519 -> #520 -> #521/#522/#523/#524/#525; merge #522/#523/#524 one at a time. #524 also waits for #516; #526 waits for #517/#522. #527 can run independently with row-change coordination; #533 is the factual docs follow-up after #515. Messages/Favorites: #503 -> #372; closed #504 enables #505/#507; #505 -> #506/#508; #508 -> #509/#510/#513; #510 -> #511; #506 + #509 -> #512; #507 -> #514. Recheck all states before dispatch.

Treat audit #536 as the first security stabilization priority. It remains needs-triage until upload provenance/cleanup design and the executable contract are settled. #537 then #538 are bounded edit-save repairs; serialize integration and coordinate any media-contract changes. Reuse #518 for restore confirmation and #494 for the known CI causes. Do not create duplicate fixes or a new orchestration framework.

Keep the accepted name/photo/car-avatar work in #353 visible until its design and build tickets exist. #354 D1-D11 are accepted; D12 is still pending and holds Sell slicing. Bring only the unresolved concrete decisions to the founder. #429/#426 proposed IN and #413/#445 proposed deferred remain unanswered; #486 stale-request admission is also proposed. Do not silently accept them. #404/#407/#452/#262 are already OUT of this first release.

Use one writing owner per issue, pushed reservations/checkpoints, early draft PRs, one mutable Execution state, independent fixed-commit Standards and Spec reviews, and green required pr CI. Preserve evidence as each worker completes. Follow the repository host/worktree/model profile rather than inventing new limits. Cloud is not assumed to have the Mac, simulator, local transcripts, unpublished screenshots or provider logins. If a required capability is missing or denied, preserve the existing PR state and report the exact missing capability; never bypass it.

Production/staging migrations and promotion, credentials, signing, physical-device proof and Console submission remain founder-owned. PR environments only for agent backend work. The Android-only gate uses #279/#282 Android evidence while their iOS criteria and full S11 closure remain open. Do not weaken the full-app release proof. Keep public signup, real SMS, TM cutover, iOS submission and post-release support chat out.

After reconciliation, report a compact current queue, live owners, missing release evidence and the next founder-only action, then continue authorized unblocked queue work without repeatedly asking for settled permissions. Keep #320 and each PR state current, with the exact next action and recoverable evidence.
```

This prompt resumes existing ordinary orchestration authority recorded on #320. It does not grant production/store authority or override host permissions. It is ready to paste; this audit did not launch or message a cloud session.

## What changed since the older handoff

The early 2 October Claude-to-Codex handoff on #320 is useful history but stale in several places. #495 Share hiding and #496's code portion merged. #502 Conversations/Favorites spec alignment, #504 peer summary and #515 Cabinet documentation also closed. The #352 prototype is sliced into #503/#505-514/#372, and the Cabinet/menu/auth part of #353 into #516-527 plus #533. Re-read the exact merged/current state rather than resuming the old “slice #352” action.

The latest founder choices supersede older suggestions:

- The reviewer release has no Support row in Messages and no extra Favorites/Conversation Help links. Cabinet Help has the approved phone/email; the daily Sign-in Code limit has the explicitly accepted Contact support exception. Full Support Conversations/images stay after release. Sources: [#352 resolution](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/352#issuecomment-5947052463), [#500 entry choice](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/500#issuecomment-5946768408), [#353 answers](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/353#issuecomment-5947334041).
- Cabinet is the menu, Settings goes away, Language/Theme are sheets, and logout/deletion finish on signed-out Cabinet. Every User has an editable random display name plus photo or assigned car avatar. The identity design and build tickets are still missing. #521 alone does not complete that release requirement.
- Selling verifies the per-Listing contact phone under ADR-0056. A phone Sign-in Method on the account is not the selling gate. Some older map prose still says otherwise. Follow the later accepted ADR and [#344 amendment](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/344#issuecomment-5947347989).
- Sell D1-D11 are all accepted. D12 asks how New cars should handle the required Damaged field. Do not infer a dealer-only New rule from Auto.ru. Finish the prototype, collect the founder choice and write a superseding/amending ADR if ADR-0052 changes, then slice. [Decision source](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/354#issuecomment-5947666654).
- Share is hidden in the reviewer build; legal links use `autotm.bagtyyar.dev`. Real sharing waits for the later public web/App Links work. `reported` was removed in #497; live deployments must include that migration and any subsequent candidate changes.

## Existing ownership at the baseline

These are reservations, not permission to take over:

| Issue | Pushed branch / PR | Observed head | Next inspection |
|---|---|---|---|
| #503 | `agent/issue-503`, #529 | `371bc96876464b255b4b5cc4a9822ddc4ed9bf5a` | Required pr green; inspect fresh independent verdicts and current integration owner before #372 |
| #516 | `agent/issue-516`, #532 | `26935a0492040bbf5045291d6c5e59e933b46120` | Required pr green; inspect reviews/owner before #524 |
| #517 | `agent/issue-517`, #534 | `6a7658dd77d889a3d0a836be4f3aeb828ac5fa63` | Required pr green; inspect reviews/owner before #526 |
| #518 | `agent/issue-518`, no PR observed at initial refresh | Tracker says implementer running | Read remote head, any newly opened PR and owner; do not start another writer |
| #535 | `agent/issue-535`, #539 | Read current head from PR | Documentation preservation and inventory belong to this audit session until it hands off/finishes |

An active prototype owner is updating #353 identity and #354 D12. Preserve `prototype/favorites-conversations`, `prototype/cabinet-profile` and `prototype/sell-wizard` as evidence branches. Do not merge/delete them merely because implementation tickets are complete. The Sell approved evidence baseline is `2aa2f39e1242d4fa2eedc5fd7784f41692a86fb6`; inspect any later D12 revision separately.

The local tracker is not copied wholesale. It contains stale operations and Mac-only paths. GitHub decisions, reservations and PR state are the portable authority. If another coordinator still owns integration, coordinate an explicit transfer in durable state before acting on the same PRs. An issue waiting for a review does not need a second writer.

## Release trajectory and founder work

1. Complete the already owned foundations, remaining approved Messages/Favorites and Cabinet slices, selected media/edit stabilization, and #353 identity/#354 Sell design-to-build gaps.
2. Triage #494 against the intended audit guarantee. Fix its documented Redis/default-port, audit timing and Prisma generation/lint causes. Do not change product audit durability merely to make a test green. #493 and #486 are not automatically admitted because an old handoff called them “ready.”
3. Build one integrated candidate with required CI and relevant native evidence. Founder executes #375 migration/reseed from the actual migration list, then #279 Android staging/build/push proof. Founder promotes exactly that proven SHA through #282 with production smoke and rollback evidence.
4. Founder completes #496 production account-deletion deployment and staging DNS/HTTPS checks. Last documented evidence had a missing production deletion page and absent staging DNS; this handoff did not freshly re-test those URLs. Recheck before asserting they are fixed. #327 assets/forms can be prepared now; #391 waits for truthful live legal/deletion proof.
5. #345 proves the full approved physical Android matrix. #325 starts manifest/artifact preparation early and finishes against the candidate. #329 freezes the exact signed AAB after matrix, manifest and Console cross-checks. Final Console submission remains human.

#279 and #282 remain open until their full iOS criteria pass. The accepted Android-only gate is criterion/platform evidence, not forced closure. #283/#270 can remain open for full S11 closeout. The milestone is a planning filter, not a calculated release percentage.

Do not keep the old 4-6 week estimate as a promise. First count independently verifiable Sell and identity outcomes, then account for native proof, device/push, domain/production and Console time. The [release decision map](2026-10-02-autotm-release-plan.md) inventories every open issue and separates accepted scope from proposals and deferred work.

## Cloud capability checks

Use the repository's installed versions and scripts. AGENTS.md and the linked workflow remain the commands/verification authority. Manually open repo skills if the host does not discover them. A cloud session needs repository access and the pushed documentation branch; local uncommitted files and Mac-only evidence are insufficient.

A concise startup probe checks the repository/branch, clean status, Node/pnpm versions against `package.json`, GitHub read/push capability, availability of isolated subagents/worktrees, Context7, and any approved PR-backend access. Do not read or print credentials. Do not query provider quota.

If cloud GitHub access cannot push the required canonical reservation branch, or lacks issue/comment/merge permissions, stop that affected operation and keep the existing reservation record. Report the exact capability and continue independent read-only/review work where possible. Do not invent a `claude/...` duplicate reservation, modify auth machinery, or bypass the proxy. If isolated writing agents are unavailable, use the repository's “Hosts without isolated subagents” route, with one issue session per selected item.

Cloud can produce source and rendered tests where supported. Native simulator/device, signing, credentials and production evidence still run in their approved local/founder lane. Report missing evidence explicitly. Hosted required CI supplies container-backed tests under ADR-0075; do not start Docker on the Mac to repeat it. Read the current host model profile instead of treating subscription count as a concurrency setting.

For any return to the Mac, preserve the founder's main checkout as their live environment. Do not pull, switch, reset or edit it. Each writer uses its own isolated worktree. Worktree retirement runs through the existing cleanup gate; cloud has no authority or ability to delete Mac-local worktrees directly.

## Setup guidance and sources

Desktop supports choosing Cloud for a session or using its Continue in menu. The CLI's `--cloud` task starts a new session rather than transferring an existing CLI conversation. Pushing this documentation branch gives the new session a durable plan. These product details were checked through Context7 `/websites/code_claude` and [official cloud-session documentation](https://code.claude.com/docs/en/claude-code-on-the-web) on 2 October 2026.

Cloud network, variables and setup scripts belong to the selected environment. Inspect its current tools before installing or changing anything. Use the project pnpm version and frozen lockfile; configure access only for required existing services. Do not paste secrets into the handoff or add a new tracked hook merely for this report. See [official environment documentation](https://code.claude.com/docs/en/cloud-environments).

If choosing a new Cloud session, select this repository and the pushed `agent/issue-535` documentation branch until PR #539 merges, then paste the prompt above. After merge, start from main. Read writers from their actual issue branches. No cloud session has been started by this audit.

## Durable evidence

- [Polished workflow audit](2026-10-02-autotm-workflow-review.html).
- [Release decision map](2026-10-02-autotm-release-plan.html) and [Markdown analysis](2026-10-02-autotm-release-plan.md).
- [Every-open-issue inventory](2026-10-02-autotm-release-inventory.json).
- [Code findings](2026-10-02-autotm-code-findings.md), [workflow findings](2026-10-02-autotm-workflow-findings.md), [Claude history findings](2026-10-02-autotm-claude-findings.md) and [Codex history findings](2026-10-02-autotm-codex-findings.md).
- [Isolated reproduction fixtures and limits](evidence/workflow-review-2026-10-02/README.md). They establish the audit baseline failure, not a green current suite or a live storage exploit.

The private raw conversation corpus stays on the Mac. The committed notes carry safe summaries and evidence excerpts. Cloud-only, deleted, other-account and off-device histories were unavailable to the original audit. Current scope decisions come from GitHub, not inference from archive statistics.
