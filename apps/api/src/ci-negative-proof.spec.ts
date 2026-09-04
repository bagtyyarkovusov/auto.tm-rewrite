/**
 * TEMPORARY — issue #278 (S11-08) negative CI-gate proof.
 *
 * This test fails on purpose so that `main` carries one revision whose
 * required GitHub Actions check is red. Railway staging deploys with
 * "Wait for CI" enabled, so no deployment may be created for this SHA.
 *
 * Reverted in the immediately following commit. If you are reading this on
 * `main`, something went wrong with that revert — delete this file.
 */
describe("issue #278 negative CI-gate proof", () => {
  it("fails deliberately so the staging deploy gate can be observed", () => {
    expect("staging must not deploy this revision").toBe("deployed");
  });
});
