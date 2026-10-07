# Issue #725 client test-first evidence gap

This is the accepted fix round for [PR #726](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/726), following its sole Standards and Spec review at `f0dc9953ad7eb1b96a20b363220416dc6bb5e89c`. The release orchestrator accepted the Standards P2 finding and confirmed ADR-0088 acceptance in [the integration disposition](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/726#issuecomment-6033119554).

## Historical evidence and disposition

No actual pre-production failing run for native header forwarding or additive contract parsing was found. The inspection covered the issue branch history, the current PR Execution state, saved earlier PR bodies and `/tmp/autotm-725-*` evidence logs. The native behavior test first appears alongside production in `099e4657`; contract parsing tests first appear in `332a3b80`, after production. The retained RED logs cover API signing/initialization at `180b24d4` and cache policy at `4fa028e1`. They do not cover these client criteria. An earlier unrecorded working-tree run remains unknown.

This does not comply with ADR-0070 and Verification acceptance evidence steps 1–2 for these code-testable criteria. The docs/generated/visual exemptions do not apply to their behavior. No exemption is claimed. The replay below proves omission detection today; it cannot retroactively satisfy test-first chronology or a pushed failing-test checkpoint. The Standards procedural finding remains unresolved pending the founder's explicit decision. PR #726 stays draft with auto-merge disabled.

## Controlled omission replay on 2026-10-07

The fix implementer created its own detached worktree at `/Users/bagtyyar/.codex/queue-worktrees/autotm-storage725-fix-20261007` from the pinned head. The original writer's worktree was only read. Dependencies were installed with `pnpm install --offline --frozen-lockfile --ignore-scripts`, exit 0. Existing ignored contracts `dist` output was copied into this worktree to resolve the runtime package entry without running a build. The initial native run collected zero tests because that output was absent; this setup failure is not RED behavior evidence.

Only these production inputs were temporarily changed, with all tests left intact:

- In `useUploadQueue.ts`, `headers: headers ?? {` became `headers: {`, restoring the pre-implementation static Content-Type behavior while keeping the opt-in request. This isolates header forwarding.
- In `uploads.ts`, the schema bytes came from `git show 099e4657^:packages/contracts/src/schemas/uploads.ts`, removing only the additive protocol and response-header fields.

Exact commands, each run with one worker:

```sh
pnpm --filter @auto-tm/mobile exec vitest run src/listings/uploadStaging/useUploadQueue.spec.tsx --maxWorkers=1 --minWorkers=1
pnpm --filter @auto-tm/contracts exec vitest run src/schemas/uploads.spec.ts --maxWorkers=1 --minWorkers=1
```

| Criterion | Omission replay | Same command after exact restoration |
|---|---|---|
| Forward signed headers to native PUT | Exit 1; 1 failed, 18 passed. The rendered hook called native upload with only `Content-Type: image/jpeg`; expected `if-match: "placeholder"`, `content-type: image/jpeg`, and `cache-control: no-store`. | Exit 0; 19 passed. |
| Preserve and validate additive response headers | Exit 1; 2 failed, 2 passed. Parsing stripped the quoted ETag header record; malformed header parsing returned success instead of false. | Exit 0; 4 passed. |

The contract replay's malformed-header assertion fails before its unsupported-protocol assertion executes, so this replay does not independently establish the latter failure. Legacy parsing and private provenance stripping passed during the omission replay.

Saved complete local outputs are `/tmp/autotm-725-fix-mobile-replay-red.log`, `/tmp/autotm-725-fix-contract-replay-red.log`, `/tmp/autotm-725-fix-mobile-green.log`, and `/tmp/autotm-725-fix-contract-green.log`. The temporary patch is `/tmp/autotm-725-fix-replay-omissions.patch`. The table records the actual assertion failures and outcomes so the evidence survives loss of those host logs.

## Restoration and bounds

`git diff --exit-code -- apps/mobile/src/listings/uploadStaging/useUploadQueue.ts packages/contracts/src/schemas/uploads.ts` returned exit 0 after byte-for-byte restoration. The existing tests and provider test also match the pinned head exactly. SHA-256 values:

| Pinned, restored input | SHA-256 |
|---|---|
| `apps/mobile/src/listings/uploadStaging/useUploadQueue.ts` | `585ebee277c70d27f148e0fe72ec5f349da5656456f1b031fc51c0bc36b9b545` |
| `packages/contracts/src/schemas/uploads.ts` | `0123af8e900c09a457462075f458eacd638a67c463c1a10f7011f83638ac79c6` |
| `apps/mobile/src/listings/uploadStaging/useUploadQueue.spec.tsx` | `f22288d15ab6888e4ac14c6b080998be59016b942327834e1cf03d4f6844f9a1` |
| `packages/contracts/src/schemas/uploads.spec.ts` | `72dc5289faaf584573582e76839d413b67653eee1f27aebaa944b97a849ed7ee` |
| `apps/api/src/modules/listings/infrastructure/ConditionalImageStorage.e2e.spec.ts` | `ab445296552b5a50672923086316ff11eae6585f3515d6ef57886cf29e1d8719` |

No production behavior or tests changed in this fix. The provider refusal/error assertions and all-nine object absence assertions remain intact. ADR-0088's status and acceptance attribution are the only ADR changes. No overview boundary changed.

Focused replay/unit, affected-file lint, agent-document and glossary checks are the authorized local gates. Repository-wide, export/build, native/emulator, container and live-provider gates were not rerun because #718 owns the heavy/native slot. Prior required `pr` success is at the reviewed SHA, run `37585374994`; a new checkpoint needs its own green required check before merge. Actual native HTTP PUT, deployed provider/versioning/cache/CORS proof and the exact server RELEASE remain missing release evidence. Common adoption/retirement/worker and profile routes remain #721/#642/#643.

Focused final checks passed with exit 0:

- `pnpm --filter @auto-tm/mobile exec eslint src/listings/uploadStaging/useUploadQueue.ts src/listings/uploadStaging/useUploadQueue.spec.tsx`
- `pnpm --filter @auto-tm/contracts exec eslint src/schemas/uploads.ts src/schemas/uploads.spec.ts --max-warnings 0`
- `pnpm test:agent-docs`, including the seven document checker tests.
- `pnpm check:glossary`, 14 terms.
- `git diff --check`.

These documentation/evidence changes are docs-only and need no artificial RED test. That exemption does not apply to the earlier client production behavior. Context7 is not applicable to this fix because no external API or configuration claim changed.
