# Production catalog regression

Issue #369 requires `камри` to return Toyota Camry. The production Camry row in `packages/db/prisma/seed/models.json` has `Camry` in all three name fields. The new application test imports that row, asserts its names, then searches `камри`, `камри 2018`, and `тойота камри`. Existing localized fixtures are retained for their separate cases.

The matcher now compares the normalized typed query against a candidate's phonetic Cyrillic form. It does not compare two synthesized Cyrillic forms, which would collapse `bmv` and `BMW` through the v/w mapping. Exact, prefix, and one-edit tiers and the four-letter typo minimum remain unchanged. `Carry` is one Cyrillic edit from `камри`, so its score remains below exact Camry. Two edits and unrelated Corolla/Crown names stay unmatched.

Command for both runs:

```sh
pnpm --filter @auto-tm/api exec vitest run src/modules/catalog/domain/CatalogSearchMatcher.spec.ts src/modules/catalog/application/SearchCatalog.spec.ts
```

Red checkpoint `8f9e189`: 2 tests failed, 29 passed. The matcher returned score 0 instead of 100; the use-case returned no Camry model. This was an assertion failure after setup, not an import failure.

Green checkpoint `2ac525703300e99e183a108bde566c5ff6186a77`: the same command passed all 31 tests. The regression also checks prefix matching, one-edit matching, rejection of two edits, and the existing short-name guard.

A preliminary run before the red checkpoint had a test JSON import path error. That path was corrected and the criterion-only red run was executed before production changes. A preliminary green run exposed an overly strict new negative assertion for Carry, whose Cyrillic spelling is one edit away. The assertion was corrected to score 50, below Camry's exact 100, consistent with the existing one-edit contract.
