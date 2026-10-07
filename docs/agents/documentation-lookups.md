# Documentation lookups

Use Context7 for external library, framework, SDK, API, CLI and cloud-service questions, including dependency-specific syntax, configuration, migrations, debugging and setup. [ADR-0017](../adr/0017-context7-as-canonical-doc-source.md) owns the choice. Internal refactors, business logic and reviews need repository evidence unless an external API claim requires verification.

## Lookup procedure

1. Inspect source and workspace package files for the operation and installed version.
2. Resolve the library ID unless the user supplied an exact `/org/project` ID. Choose the relevant reputable match and version.
3. Query the specific operation. If insufficient, narrow the question and retry using arguments supported by the exposed tool. If the server remains unavailable after one retry, use official upstream documentation and record the fallback.
4. Record the library ID, verified behavior and any fallback in Execution state. Internal-only changes record `not applicable`.

## Boundaries

The issue and owning specification define intended behavior; source and runtime evidence establish current behavior. Context7 establishes neither. Use [the context map](../../CONTEXT-MAP.md) to find the owning area and the lockfile for resolved versions.

Mobile dependency and runtime work also follows [mobile/Expo checks](mobile-expo.md); styling and data fetching follow [NativeWind](nativewind-v4.md) and [mobile data fetching](mobile-data-fetching.md). [Verification](../../.claude/skills/run-issue/VERIFICATION.md) owns evidence requirements.
