# Isolated audit reproductions

These three fixtures reproduced missing guarantees at source baseline `8ed5dcbdd2ecbca3e494f4e18e17edd91f3c0edb`. They use fake API/storage ports or the mobile rendered adapter. No network, live API, database or object storage was used.

They are intentionally outside the repository test suite. The [archived text result](archived-results.txt) and [sanitized runner JSON](archived-results.json) contain exactly three tests, all failing the expected business assertions. This is evidence of the reported defects, not a claim that existing repository tests fail.

After installing this checkout's dependencies and building its shared workspace prerequisites, run from `apps/mobile`:

```sh
pnpm exec vitest run --config ../../docs/research/evidence/workflow-review-2026-10-02/vitest.config.ts
```

The config and imports were made relative when preserved. Consult the PR Execution state for whether the portable form has been rerun; the archived output alone does not verify the relocation. Adapt the fixtures into owning-area regression tests in #536, #537 and #538. Use their red/green behavior, rather than treating these scratch mocks as production test design.

Native layout, keyboard/navigation timing, HTTP authorization and real storage effects remain untested by these fixtures. Hosted integration and native/device evidence are separate gates.
