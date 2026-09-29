# Documentation lookups

Use Context7 when a task asks about an external library, framework, SDK, API, CLI, or cloud service. Before writing or debugging code that touches one of these dependencies, resolve and query it through Context7, even if the API seems familiar. This includes API syntax, configuration, version migration, package-specific debugging, and setup. [ADR-0017](../adr/0017-context7-as-canonical-doc-source.md) records the decision.

Read this repository's source, tests, package files, and lockfile for our implementation and installed versions. Context7 answers questions about the external dependency. A business-logic bug, code review, internal refactor, or general programming question with no external dependency touched needs repository evidence rather than a library lookup.

## Lookup procedure

1. Call `resolve-library-id` with the library name and the full task question. Skip resolution only when the user supplies an exact `/org/project` ID. Choose the match by name, relevant description, snippet coverage, source reputation, benchmark score, and the installed version when the question is version-specific. Retry with an alternate name if the matches are poor.
2. Call `query-docs` with the selected ID and the specific full question. Use the matching version ID when one is available and the installed version matters. Do not treat the newest documentation as proof of behavior in an older installed version.
3. If the answer is insufficient, query the same ID with `researchMode: true`. If Context7 is unavailable after one retry, consult official upstream documentation and record the fallback.
4. In the PR's Execution state, record the library ID, the behavior or API verified, and any official-source fallback. A pure internal change records `not applicable`.

A useful query names the actual operation and version, such as “How does TanStack Query v5 match hierarchical keys in `invalidateQueries`?” A one-word query rarely identifies the needed behavior.

## Boundaries

The [issue and owning specification](coding-workflow.md) define intended behavior; source, schema, tests, and runtime evidence define AutoTM's current behavior. The [local overview](../../CONTEXT-MAP.md) locates source and names important boundaries. Context7 does not establish either project-specific truth.

Use the installed version from workspace `package.json` files and `pnpm-lock.yaml`; avoid maintaining another version catalogue here. For mobile dependency alignment and runtime checks, use [mobile-expo.md](mobile-expo.md). For task-specific NativeWind and data-fetching constraints, use [nativewind-v4.md](nativewind-v4.md) and [mobile-data-fetching.md](mobile-data-fetching.md). These guides supplement the lookup procedure when that area is affected.

A reviewer checks whether an external API claim has current, version-appropriate evidence. The current [verification gate](../../.claude/skills/run-issue/VERIFICATION.md) owns that check; `CLAUDE.md` only loads the shared root policy.
