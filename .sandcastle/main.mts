// Kimi-Sandcastle — parallel planner + review orchestration loop for auto.tm-rewrite.
//
//   Phase 1 (Plan):    A Kimi planner reads the `ready-for-agent -blocked` issue
//                      queue, builds a dependency graph, and emits a <plan> JSON
//                      of unblocked issues + `sandcastle/issue-<N>-<slug>` branches.
//   Phase 2 (Execute): For each issue a sandbox is created (own Docker container +
//                      git worktree). The implementer runs first (≤100 iters); if it
//                      commits, a reviewer runs in the same sandbox (1 iter). All
//                      issue pipelines run concurrently via Promise.allSettled().
//   Phase 3 (Merge):   One merger merges the completed branches into the current
//                      branch and closes the child issues.
//
// The outer loop repeats up to MAX_ITERATIONS so newly-unblocked issues are picked
// up after each round of merges.
//
// Run: `pnpm sandcastle`  (= tsx .sandcastle/main.mts). Set MAX_ITERATIONS=1 for a
// smoke test. Requires .sandcastle/.env (KIMI_API_KEY, GH_TOKEN, CONTEXT7_API_KEY)
// and a running Docker daemon. See docs/agents/sandcastle.md + ADR-0028.

import * as sandcastle from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// plan→execute→merge cycles before stopping. Override for a quick smoke test:
//   MAX_ITERATIONS=1 pnpm sandcastle
const MAX_ITERATIONS = Number(process.env.MAX_ITERATIONS ?? 10);

// Agent: Claude Code (the `claude` CLI) pointed at Kimi's Anthropic-compatible
// endpoint. ANTHROPIC_BASE_URL=https://api.kimi.com/coding/ + ANTHROPIC_API_KEY are
// forwarded into each sandbox from .sandcastle/.env (see EnvResolver). The model id
// matches the one the native Kimi config used.
const MODEL = "kimi-k2.6";

// Dependency strategy (supersedes ADR-0028 D3 — needs a follow-up ADR once proven).
// The slow planner→implementer gap was `pnpm install` COPYING ~2GB: the warm store
// lived in-VM (overlay) while the worktree's node_modules lived on the macOS host
// share, and Docker treats those as separate mounts — so pnpm can't hardlink across
// them (proven: `ln` returns EXDEV even though both report the same st_dev). Fix:
// keep the store INSIDE the worktree bind-mount so store + node_modules are the SAME
// mount and pnpm hardlinks (metadata-only) instead of copying content.
//   onWorktreeReady (host): clone the shared host store into <worktree>/.pnpm-store
//     natively (APFS clonefile — instant, CoW; never crosses the FUSE boundary).
//   onSandboxReady (sandbox): point pnpm at that in-worktree store, then install.
// The shared host store (.sandcastle/.pnpm-store) is populated once from the image's
// baked store — see docs/agents/sandcastle.md. Both stores are named `.pnpm-store`
// so the existing root .gitignore rule covers them.
const SHARED_STORE = `${process.cwd()}/.sandcastle/.pnpm-store`;
const WORKTREE_STORE = "/home/agent/workspace/.pnpm-store";

const implementerHooks = {
  host: {
    onWorktreeReady: [
      {
        command: `cp -Rc "${SHARED_STORE}" .pnpm-store 2>/dev/null || cp -R "${SHARED_STORE}" .pnpm-store`,
        timeoutMs: 300_000,
      },
    ],
  },
  sandbox: {
    onSandboxReady: [
      {
        command: `pnpm config set store-dir ${WORKTREE_STORE} --global && pnpm install --offline --frozen-lockfile && pnpm --filter @auto-tm/db generate`,
        timeoutMs: 300_000,
      },
    ],
  },
};

// The merger also runs the gate (typecheck), so it installs too — but it's a single
// serial sandbox, not the parallel hot path, so it keeps the simple in-VM-store
// install (one ~2GB copy per merge cycle). Optimize later if it becomes a pain
// (run() doesn't fire onWorktreeReady, so the in-worktree-store trick needs more work).
const mergerHook = {
  sandbox: {
    onSandboxReady: [
      {
        command:
          "pnpm install --offline --frozen-lockfile && pnpm --filter @auto-tm/db generate",
        timeoutMs: 300_000,
      },
    ],
  },
};

// The planner only reads issues via `gh`/`git`; it needs no dependencies, so it
// runs without the install hook.

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);

  // -------------------------------------------------------------------------
  // Phase 1: Plan
  //
  // Kimi with thinking disabled (faster/cheaper, and avoids the planner
  // shell-loop observed with thinking on). One iteration: read + reason only.
  // -------------------------------------------------------------------------
  const plan = await sandcastle.run({
    sandbox: docker(),
    name: "planner",
    maxIterations: 1,
    agent: sandcastle.claudeCode(MODEL),
    promptFile: "./.sandcastle/plan-prompt.md",
  });

  // Extract the <plan>…</plan> block from the agent's stdout. Use the LAST match:
  // the planner's output may mention <plan> inline before the real block.
  const planMatches = [...plan.stdout.matchAll(/<plan>([\s\S]*?)<\/plan>/g)];
  const planBlock = planMatches[planMatches.length - 1]?.[1];
  if (!planBlock) {
    throw new Error(
      "Planning agent did not produce a <plan> tag.\n\n" + plan.stdout,
    );
  }

  const planJson = planBlock
    .replace(/```(?:json)?\s*/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\t/g, "\t")
    .trim();
  const { issues } = JSON.parse(planJson) as {
    issues: { id: string; title: string; branch: string }[];
  };

  if (issues.length === 0) {
    console.log("No unblocked issues to work on. Exiting.");
    break;
  }

  console.log(`Planning complete. ${issues.length} issue(s) to work in parallel:`);
  for (const issue of issues) {
    console.log(`  ${issue.id}: ${issue.title} → ${issue.branch}`);
  }

  // -------------------------------------------------------------------------
  // Phase 2: Execute + Review
  //
  // One sandbox per issue (implementer + reviewer share it on the same branch).
  // Promise.allSettled so one failing pipeline doesn't cancel the others.
  // -------------------------------------------------------------------------
  const settled = await Promise.allSettled(
    issues.map(async (issue) => {
      const sandbox = await sandcastle.createSandbox({
        branch: issue.branch,
        sandbox: docker(),
        hooks: implementerHooks,
      });

      try {
        const implement = await sandbox.run({
          name: "implementer",
          maxIterations: 100,
          agent: sandcastle.claudeCode(MODEL),
          promptFile: "./.sandcastle/implement-prompt.md",
          promptArgs: {
            TASK_ID: issue.id,
            ISSUE_TITLE: issue.title,
            BRANCH: issue.branch,
          },
        });

        // Only review if the implementer produced commits.
        if (implement.commits.length > 0) {
          const review = await sandbox.run({
            name: "reviewer",
            maxIterations: 1,
            agent: sandcastle.claudeCode(MODEL),
            promptFile: "./.sandcastle/review-prompt.md",
            promptArgs: {
              BRANCH: issue.branch,
            },
          });

          // Merge both runs' commits so the merge phase sees all of them.
          return { ...review, commits: [...implement.commits, ...review.commits] };
        }

        return implement;
      } finally {
        await sandbox.close();
      }
    }),
  );

  for (const [i, outcome] of settled.entries()) {
    if (outcome.status === "rejected") {
      console.error(
        `  ✗ ${issues[i]!.id} (${issues[i]!.branch}) failed: ${outcome.reason}`,
      );
    }
  }

  // Only branches that actually produced commits go to the merge phase.
  const completedIssues = settled
    .map((outcome, i) => ({ outcome, issue: issues[i]! }))
    .filter(
      (entry) =>
        entry.outcome.status === "fulfilled" &&
        entry.outcome.value.commits.length > 0,
    )
    .map((entry) => entry.issue);

  const completedBranches = completedIssues.map((i) => i.branch);

  console.log(
    `\nExecution complete. ${completedBranches.length} branch(es) with commits:`,
  );
  for (const branch of completedBranches) {
    console.log(`  ${branch}`);
  }

  if (completedBranches.length === 0) {
    console.log("No commits produced. Nothing to merge.");
    continue;
  }

  // -------------------------------------------------------------------------
  // Phase 3: Merge
  //
  // One merger merges all completed branches into the current branch and closes
  // the child issues. Per D1 it relies on CI (pr-checks.yml / ci.yml on the
  // tm-proxy runner) for the Testcontainers e2e gate — no Docker-in-Docker here.
  // -------------------------------------------------------------------------
  await sandcastle.run({
    hooks: mergerHook,
    sandbox: docker(),
    name: "merger",
    maxIterations: 1,
    agent: sandcastle.claudeCode(MODEL),
    promptFile: "./.sandcastle/merge-prompt.md",
    promptArgs: {
      BRANCHES: completedBranches.map((b) => `- ${b}`).join("\n"),
      ISSUES: completedIssues.map((i) => `- ${i.id}: ${i.title}`).join("\n"),
    },
  });

  console.log("\nBranches merged.");
}

console.log("\nAll done.");
