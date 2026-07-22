# Verification

Verification is evidence collection, not a ceremonial command list. Map each issue acceptance criterion to a test, inspection, or manual proof.

## Authority and scope

1. Re-read the issue and every referenced document after implementation.
2. Inspect the diff for accidental scope growth and unrelated user files.
3. Check the relevant `CONTEXT.md` before and after the change.
4. Treat issue file lists as expected scope, not a ban on mechanically required tests, migrations, generated lockfiles, or documentation.
5. Treat grep/static-scan findings as leads; inspect them before calling them defects.

## Required gates

- Run typecheck, lint, and tests for every touched workspace.
- Run the narrowest useful tests during development, then the repository-required gate before finalization.
- For API/domain changes, verify layer boundaries, one-use-case-per-file, cross-context ports/events, and absence of Prisma imports in domain code.
- For schema changes, require a committed Prisma migration and verify runtime consumers.
- For TypeScript package-boundary changes, follow `docs/agents/typescript-runtime.md` and run the runtime-import gate.
- For mobile/Expo work, read `docs/agents/mobile-expo.md` before dependency/config changes and run its dependency, typecheck, export, and runtime/simulator gates as applicable.
- For mobile UI, also read `docs/agents/nativewind-v4.md` and the current UI sources named by the design spec.
- For external libraries, record the Context7 library ID and what was verified.

The Claude host flow is not the Sandcastle sandbox gate. Run all relevant host-capable tests. If Testcontainers, CI, credentials, hardware, or a simulator is genuinely unavailable, name the skipped gate, why it is unavailable, and where it must run; never report it as passed.

## Documentation gate

ADR-0019 has no sprint-final exception. In the same PR as an invariant change, update the relevant current-state `CONTEXT.md` for any added or changed:

- Prisma model or field;
- domain invariant or type;
- port or use-case;
- event or consumer;
- HTTP/WS route; or
- app/package/context structure.

Update `CONTEXT-MAP.md` when the set or ownership of contexts changes. Do not put future state in `CONTEXT.md`.

Under ADR-0020:

- never edit merged ADRs; create a superseding ADR after user direction;
- never rewrite a locked sprint plan to match what happened;
- use retros for post-start scope changes;
- update mutable feature/flow docs only when the shipped behavior changes their target truth.

## Failure policy

For the same root failure, make at most three focused repair attempts. Do not count waiting for a running check as an attempt. After the cap—or immediately when authority or environment is missing—preserve state and bail using `BAIL-AND-RECOVERY.md`.

Before finalization, produce a compact evidence table:

| Acceptance criterion | Evidence | Result |
|---|---|---|
| `<criterion>` | `<test, file, command, or manual proof>` | pass / blocked |

No `<promise>COMPLETE</promise>` or “done” claim is valid while any required row is blocked.
