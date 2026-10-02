> Archived assessment, 2 October 2026. Evidence uses the original audit baseline. Live GitHub and the release map govern execution. Private raw transcripts and temporary indexes are intentionally omitted. This note contains sanitized evidence summaries, not a portable copy of the private corpus.

# AutoTM Claude history audit

Prepared 2026-10-02 for the main audit. Read-only analysis. Dates below use Asia/Shanghai unless explicitly labelled UTC.

## Main judgment

Your biggest problem is coordination cost and a moving release target. It is not a shortage of models, subscriptions, coding output, rules, or ambition. The records show considerable useful coding and increasingly strong checks. They also show you repeatedly paying to reconstruct state, route around an unavailable provider, clean worktrees, rescue unpushed commits, resolve hardware contention, and decide what counts as the release.

The best next action is to turn the existing #320 release map into one authoritative, current reviewer-build plan. Fix the required journeys and release gates, name the unfinished decisions and human work, give each item an owner and measurable proof, and hold optional additions until after submission. Use the existing queue to execute that plan. Do not start another general orchestration framework before proving that today's workflow can deliver one complete candidate.

This is an inference from history, not a claim that every old problem still exists. Several major problems were corrected in the last week. The repo audit must establish what remains today.

## Corpus and limits

- Parsed 362 AutoTM project conversation JSONL files, 574,186,764 bytes and 107,323 JSONL records. This includes 95 root-session files representing 94 distinct session IDs and 267 subagent files. One root file has only copied title metadata.
- Full retained conversation records cover September 3 through October 2, 2026 in Asia/Shanghai, September 2 through October 2 in UTC. These span the main checkout and Claude-managed worktrees. Entry-point fields distinguish desktop and CLI, although the same transcript format serves both.
- Extracted user text, assistant text, final assistant text, origin metadata, timestamps, line numbers and paths. Tool-result bodies and hidden reasoning were not counted as founder prompts. UUID-based deduplication detected 4,785 duplicated message records across forks/copies.
- The extraction contains 530 unique root direct-input candidates and 634 unique root final assistant text records. The 530 is not a count of human requests. It includes terminal echoes, compact/model commands and orchestrator instructions to workers. A conservative heuristic partitions those candidates into 390 founder-input candidates, 73 command/echo records, 34 terminal input/output records and 33 worker/probe instructions. Some founder candidates contain pasted handoffs or transcripts; this is also not a count of independent decisions.
- Reviewed all 274 project-matched entries in `[private local archive]`, covering 88 session IDs from May 14 to October 2 in local time. This is prompt-only history. It cannot prove assistant answers or task outcomes. It overlaps later full transcripts and must not be added to them as an independent conversation count.
- Desktop metadata identifies 103 AutoTM Claude Code sessions. Only 61 referenced transcript IDs survive in the accessible local corpus. Metadata titles are evidence that the other sessions existed, not a substitute for their missing contents.
- Inspected the six local Cowork session metadata records and their six transcript files for an AutoTM/project match. None matched.
- No identifiable AutoTM ordinary Claude cloud-chat export was found. The Claude IndexedDB directory totals about 3.9 MB across ten files and has no `AutoTM`, `autotm` or project-name match. This does not establish that cloud chats never existed; it means this audit cannot claim to have read them. No credentials, cookies or account tokens were opened.
- Analysis method was a complete structured pass and searchable index, followed by close reading of the recurring incidents, decisions, recent release work and representative root/subagent outcomes. It was not a word-for-word reading of every tool log in 574 MB.

Derived files, all outside the repo:

- `[temporary audit index, not published]`, extracted searchable text records, about 9.3 MB.
- `[temporary audit index, not published]`, session inventory and exact counts.
- `[temporary audit index, not published]`, chronological root input candidates.
- `[temporary audit index, not published]`, candidate classifications.
- `[temporary audit index, not published]`, earlier CLI prompt-only history with original line numbers.
- `[temporary audit index, not published]`, selected original assistant records.

The history contains operational details and reviewer identity examples. The public-facing HTML should quote only the safe brief excerpts below, not embed raw transcripts or these full indexes.

## Strong evidence across the history

### C1. Cleanup was already founder work on day one

**May 14, 2026, 07:44. Founder prompt.** CLI history line 1115 [private local evidence; original locator withheld from Git], session `d45805e9-170a-4d55-90a2-cf45c0ce6a9b`.

> "can we close all the branches and only let the main to stay ... remove the worktrees"

September and October bring the same requests after reviews and merges. This is a recurring maintenance burden, rather than an isolated complaint. The founder correctly wants completed work to stop consuming mental and disk space. Do not recommend indiscriminate deletion; the later logs include dirty detached branches and closed-unmerged work that still needs preservation decisions.

**Already improved:** the worktree cleanup gate was implemented in October. The question now is whether the orchestrator can complete it in its allowed lane, whether owners are recorded, and whether unresolved `keep` rows get a disposition instead of accumulating indefinitely.

### C2. The founder has asked for real runtime visibility since May

**May 16, 2026, 18:18 and 18:28. Founder prompts.** CLI history line 1208 [private local evidence; original locator withheld from Git], line 1209 [private local evidence; original locator withheld from Git].

> "there are big insconsitent items on our ui right now"

> "the ui looks broken on all pages"

These are prompt-only records, so the specific root cause cannot be inferred. They prove an early gap between changes made and what the founder saw in the app. The repeated requests for simulator logs, Expo runtime access, updated package guidance and usable OTP entry points were sensible responses.

**Practical implication:** do native proof early enough to change the implementation. Reserve the relevant simulator/Metro lane, use a known backend and seed, show the source revision and observed screen states, and check that a fresh launch really serves the intended bundle. HTML prototypes and many unit tests did not remove the later native failures.

### C3. The intended first milestone was reviewer-only, not a public Turkmenistan launch

**July 20, 2026, 02:18 and 02:24. Founder prompts.** CLI history line 1348 [private local evidence; original locator withheld from Git], line 1352 [private local evidence; original locator withheld from Git].

> "no real users ... we will use demo accounts for the testers"

The founder separated Railway review infrastructure from future TM hosting and real OTP delivery. This is a good scope decision. Later audit recommendations should preserve that phased release contract instead of pretending all future hosting and SMS constraints must be finished before the reviewer build.

**Further good judgment:** September 16 local time, desktop transcript line 824 [private local evidence; original locator withheld from Git], explicitly focuses Google Play while Apple enrolment waits until October. October 2 later defers support chat and dealer conversations without a listing. These decisions reduced scope when recorded and followed.

### C4. Temporary files and optimistic provider mutations damaged recovery evidence

**September 13, 2026, 00:48. Assistant report.** Production-foundation transcript line 1061 [private local evidence; original locator withheld from Git].

> "`/tmp` was cleared ... the original handoff and every scratch script"

The same report says a production Postgres `sleep infinity` start command survived from the previous week, and a mutation returned `true` without clearing the actual value. This is historical agent evidence, not a fresh provider-state check. Earlier line 773 [private local evidence; original locator withheld from Git] explicitly recorded foundation criterion 7 as breached because duplication auto-deployed application services for roughly 11 minutes.

**Implication:** provider writes need read-back and operational proof; session summaries alone are insufficient. Handoffs and evidence that another session must recover should live in pushed PR state or a stable operations directory. `/tmp` is appropriate for this requested report, not the only copy of release or incident evidence.

### C5. The workflow already corrected several costly rules

**September 28, 2026, 22:57. Assistant completion report.** Workflow transcript line 1978 [private local evidence; original locator withheld from Git].

> "a new ADR removing the Codex requirement and the two-issue limit"

It records provider-neutral review, ADR-0064, corrected web package dependencies, native Home proof and cleanup. September 29, 02:57, line 3340 [private local evidence; original locator withheld from Git] reports protected main, auto-merge, the first follow-up batch and the small-change ADR.

The founder's frustration was concrete. Line 1661 [private local evidence; original locator withheld from Git] requests removing the provider and two-issue bottlenecks, saying it is "exhausting to wait for codex or different provider when review is needed". The completion report above proves the policy was adopted.

**Already improved elsewhere:** disposable CI services, docs CI fast path, stale-run cancellation, Sandcastle retirement, run-queue, native resource leases, hosted PR CI, digest-pinned MinIO and Railway PR backends. Recommendations to introduce these as though absent would be stale. Check their execution and gaps instead.

### C6. Unrestricted agent count ran into one physical Mac

**October 1, 2026, 01:45 and 11:53. Assistant reports.** Resource transcript line 147 [private local evidence; original locator withheld from Git], line 938 [private local evidence; original locator withheld from Git].

> "Docker Desktop's VM ... about 4.9 GB with zero containers running"

> "The Mac has 16 GB and can't run all of our work at once"

These measurements are historical, and the later memory table mixes measured and estimated values. The useful fact is the demonstrated contention. The durable handoff line 56 [private local evidence; original locator withheld from Git] records a native implementer stopping on exit 75 because #374 and #454 competed for the global lease. Line 61 [private local evidence; original locator withheld from Git] explicitly concludes one heavy-phase implementer at a time.

**Already improved:** hosted CI and Railway PR backends were the right direction. Four subscriptions are capacity to choose and resume workers; they are not four independent simulators, memory pools, or databases on one Mac. Parallelize reading, independent writing and reviews, and admit native/build phases according to the resources actually available.

### C7. Test volume did not equal trustworthy behavior proof

**October 1, 2026, 22:54 and 22:56. Assistant reports.** Search-review transcript line 260 [private local evidence; original locator withheld from Git], line 296 [private local evidence; original locator withheld from Git].

> "would pass even if that code were deleted"

The keyboard-dismiss assertion counted calls left by earlier tests. The simulator had not shown an on-screen keyboard, so it did not fill the gap. The fix reset the mock and demonstrated that removing the dismiss call failed the test. This is a good review and repair outcome, not an outstanding defect to reopen.

**Implication:** review tests as executable claims. Prioritize tests whose failure proves the user-visible behavior is broken. Reset shared mocks, keep native adapters close to real event behavior, and avoid treating an import failure as a behavioral TDD checkpoint. Do not reward ever-rising test counts as the principal quality metric.

### C8. Progress and review verdicts were still lost during orchestration handoffs

**October 2, 2026, 00:03. Assistant recovery report.** CLI orchestration transcript line 64 [private local evidence; original locator withheld from Git].

> "Both reviews were lost and neither verdict was posted"

It describes PR #490 and says PR #488's successful remote proof files existed only in `/tmp` and were not committed. The next session had to commit proof and rerun reviews. The durable October 1 handoff line 48 [private local evidence; original locator withheld from Git] separately records an implementer stopping at a session limit with two unpushed commits.

**Implication:** a worker is finished only when its output is recoverable. Each review should write a structured verdict file or PR comment as it completes, with the pinned SHA. Each implementation should push its recoverable checkpoint and update Execution state before approaching a quota boundary. The orchestrator should reconcile children from saved state, not depend on receiving all final messages before its own context ends.

### C9. Release estimates moved when the actual scope was clarified

**October 1, 2026, 22:57 and 23:26. Assistant estimates.** Release transcript line 332 [private local evidence; original locator withheld from Git], line 507 [private local evidence; original locator withheld from Git].

> "with the redesigns in scope ... roughly 4 to 6 weeks"

The preceding estimate was 2 to 4 weeks and explicitly admitted it had not checked whether the release waited on #352, #353 and #354. These are historical unvalidated estimates, not a forecast this audit endorses. The later full plan identified three unbuilt screen groups and placed design decisions on the critical path.

**Implication:** forecast from remaining release outcomes, dependencies and human proof. Do not forecast from seven to sixteen merged PRs per day, especially when many PRs are workflow or evidence fixes. A large number of merged issues can coexist with unfinished Cabinet, Conversations or Sell journeys.

### C10. Late prototype review found real product logic gaps, while the founder deferred optional scope

**October 2, 2026, 15:01. Assistant prototype/code comparison.** Cabinet transcript line 699 [private local evidence; original locator withheld from Git].

> "Pressing Cancel does not cancel: listings are already public again"

The report claims account restoration occurs when the sign-in code is verified, before the Restore prompt. It also claims the API does not distinguish cooldown from a daily code limit. This must be corroborated against current source and task state before calling it an unresolved bug. The review did not run the app; it compared code and prototype.

Line 586 [private local evidence; original locator withheld from Git] proposes fourteen Favorites/Messages tickets, and line 699 proposes twelve Cabinet/Profile tickets. These are concrete new release work, not just cosmetic polish.

The founder's 14:28 support-chat prompt, line 507 [private local evidence; original locator withheld from Git] asks whether to defer in-app support and use Help email/phone for release. Line 593 [private local evidence; original locator withheld from Git] asks how listing-bound conversations work; the following answer proposes retaining them for release. This is useful founder judgment: ask the domain question and explicitly defer the new general chat capability.

## Priority improvements inferred from this history

### 1. Freeze a release defined by journeys and proofs

Use #320 and the approved screen map as the release authority. Add a short current state for each mandatory journey: browse/search/detail; sign in by the approved methods; save favorites; start and continue a listing conversation; sell/manage listings with verified contact; help/legal/deletion. Link the existing implementation PRs and #345 device proof, plus the production/reviewer build and Console gates.

Distinguish code complete, native proof complete, production/reviewer proof complete and ready to submit. Agree which redesigned features must be implemented before submission and which can wait. Every newly discovered optional design improvement gets a post-release home unless it repairs a required journey. Keep high-impact auth/deletion defects in the release when current evidence confirms them.

### 2. Make recovery a deliverable of every worker

Keep exact branch, SHA, PR, pending CI, next action, proof path and unfinished human decision in one durable Execution state. A child produces a saved verdict/result before returning; the orchestrator posts or reconciles it. Carry authorization and its scope clearly so later sessions do not repeatedly ask the founder the same settled question, while genuine tool permission denials remain explicit.

A pre-limit handoff is useful, but the stronger rule is checkpoint continuously at meaningful milestones. No single provider reset should erase proof or force a complete review rerun. Keep `/tmp` as working scratch, then promote evidence that matters to its durable location.

### 3. Limit scarce work, not the number of subscriptions

Maintain an execution lane for native capture/builds with a named simulator, Metro port, backend revision and owner. Let independent read-only reviews and light writing overlap. Start heavy work only when its lane can admit it. A resource denial should return a recoverable waiting state with a clear next event, rather than leave a half-finished local branch forgotten.

The best default for the existing four subscriptions is one active orchestrator, a small number of independent writers, fresh-context reviewers, and one native lane until actual measurement proves another fits. Use another account/provider when a task is recoverable and its current worker is blocked by quota. Do not make model comparisons or subscription utilisation the principal planning metric.

### 4. Use the existing small-change and Delta paths consistently

The founder was right that a ten-line fix should not become a full new issue cycle. ADR-0065 already exists. Apply it, batch related non-blocking follow-ups by area, and fix accepted in-scope review findings in the same PR. Keep independent pinned reviews for risky behavior. Do not rerun full reviews merely because an evidence sentence changed; check the relevant Delta according to the adopted workflow.

Avoid new line-count policy debates or another prompt-file rewrite unless evidence shows the present instructions cause a specific recurring failure.

### 5. Measure trusted outcomes and failures

Track time from start to merged-and-proven outcome, first-pass CI success, review rework, task recovery after a session limit, unresolved device findings and founder interruptions. Separate code failures, infrastructure failures, flaky tests and missing evidence. Historical agent explanations changed as evidence arrived; confidently labelling a CI failure a flake is not enough.

The records show good independent reviews catching missing dependencies, signed-out favorite state, false-positive keyboard assertions and possible deletion behavior. Keep those gates. Make them cheaper and more reliable, then measure whether fixes prevent repeats.

## What to preserve

The repo has useful strengths: founder-approved prototypes, explicit phased hosting, domain boundaries, an issue map, pinned independent review, protected merges, device evidence, and honest records of some incidents. The founder repeatedly asks for proof rather than accepting that a build means a working screen. The system can correct its own rules when their cost becomes clear.

My candid concern is that the development process is becoming another product you maintain. The last days show considerable work on agents, provider routing, worktree cleanup, native test adapters and CI, while essential screen groups were still being specified. Some of that work was necessary and has now paid off. Give it a clear completion point. The next success should be a usable, fully proven reviewer candidate, not a more elaborate agent organisation.
