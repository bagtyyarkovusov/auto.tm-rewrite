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
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const readSandcastleEnv = async () => {
  const content = await readFile(".sandcastle/.env", "utf8").catch(() => "");
  const env: Record<string, string> = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted) value = value.slice(1, -1);
    env[key] = value;
  }

  return env;
};

const pushCurrentBranch = async () => {
  const sandcastleEnv = await readSandcastleEnv();
  const env = { ...process.env, ...sandcastleEnv };
  const { stdout } = await execFileAsync("git", ["branch", "--show-current"], {
    env,
  });
  const branch = stdout.trim();
  if (!branch) {
    throw new Error("Cannot push: current git branch is empty/detached.");
  }

  await execFileAsync("gh", ["auth", "setup-git"], { env });
  await execFileAsync("git", ["push", "origin", branch], { env });
  console.log(`Pushed ${branch} to origin.`);
};

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

// Kimi K2.6 reasons by default, and the Claude Code stream-json parser now surfaces
// those `thinking` blocks as first-class events (and silences the high-frequency
// `thinking_tokens` progress counter) — see the vendored fork's AgentProvider. So
// enable thinking for every phase with a 16K budget: Kimi's docs recommend
// max_tokens >= 16000 for K2-thinking to avoid truncating reasoning + final answer.
// (`CLAUDE_CODE_DISABLE_THINKING` was a no-op — not a real Claude Code env var — so
// it's gone; `MAX_THINKING_TOKENS` is the real lever, and the Anthropic API forces
// temperature=1.0 whenever thinking is on, which matches Kimi's recommendation.)
const CLAUDE_CODE_THINKING_ENV = {
  MAX_THINKING_TOKENS: "16000",
};

const kimiClaudeAgent = (effort: "low" | "medium" = "low") =>
  sandcastle.claudeCode(MODEL, {
    effort,
    env: CLAUDE_CODE_THINKING_ENV,
  });

// Dependency strategy (Sandcastle-only pnpm 10 experiment).
// Do not copy/clone node_modules or a per-worktree store onto the macOS bind mount:
// that creates 1-2GB of host filesystem churn per agent. Instead, keep pnpm's store
// inside Docker's Linux filesystem and opt only Sandcastle installs into pnpm's
// global virtual store. The host worktree receives mostly symlinks in node_modules;
// package contents stay in /home/agent/.pnpm-store.
const SANDCASTLE_ENV = "CI=1 COREPACK_ENABLE_PROJECT_SPEC=0";
const SANDCASTLE_PNPM = `${SANDCASTLE_ENV} pnpm`;
const SANDCASTLE_INSTALL =
  `${SANDCASTLE_PNPM} install --offline --frozen-lockfile --config.enableGlobalVirtualStore=true --package-import-method=hardlink`;
const SANDCASTLE_INSTALL_TIMEOUT_MS = 600_000;
const SANDCASTLE_GIT_AUTH = "gh auth setup-git";

const implementerHooks = {
  sandbox: {
    onSandboxReady: [
      {
        command: `${SANDCASTLE_INSTALL} && ${SANDCASTLE_PNPM} --filter @auto-tm/db generate`,
        timeoutMs: SANDCASTLE_INSTALL_TIMEOUT_MS,
      },
    ],
  },
};

// The merger also runs the gate (typecheck), so it installs too. Run it in a
// temporary Sandcastle worktree (branchStrategy below), never the root checkout:
// pnpm 10 may purge incompatible node_modules layouts, and that is only safe
// inside a throwaway worktree. Also wire GH_TOKEN into Git so the merge agent can
// fetch/push over HTTPS without an interactive prompt.
const mergerHook = {
  sandbox: {
    onSandboxReady: [
      {
        command: SANDCASTLE_GIT_AUTH,
        timeoutMs: 30_000,
      },
      {
        command: `${SANDCASTLE_INSTALL} && ${SANDCASTLE_PNPM} --filter @auto-tm/db generate`,
        timeoutMs: SANDCASTLE_INSTALL_TIMEOUT_MS,
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
    agent: kimiClaudeAgent("low"),
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
          agent: kimiClaudeAgent("medium"),
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
            agent: kimiClaudeAgent("low"),
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
    branchStrategy: { type: "merge-to-head" },
    name: "merger",
    maxIterations: 1,
    agent: kimiClaudeAgent("low"),
    promptFile: "./.sandcastle/merge-prompt.md",
    promptArgs: {
      BRANCHES: completedBranches.map((b) => `- ${b}`).join("\n"),
      ISSUES: completedIssues.map((i) => `- ${i.id}: ${i.title}`).join("\n"),
    },
  });

  await pushCurrentBranch();

  console.log("\nBranches merged.");
}

console.log("\nAll done.");
