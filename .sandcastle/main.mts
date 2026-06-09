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
  const { stdout } = await execFileAsync("git", ["branch", "--show-current"], {
    env: HOST_ENV,
  });
  const branch = stdout.trim();
  if (!branch) {
    throw new Error("Cannot push: current git branch is empty/detached.");
  }

  await execFileAsync("gh", ["auth", "setup-git"], { env: HOST_ENV });
  await execFileAsync("git", ["push", "origin", branch], { env: HOST_ENV });
  console.log(`Pushed ${branch} to origin.`);
};

const execGit = async (args: string[], options: { cwd?: string } = {}) =>
  execFileAsync("git", args, {
    ...options,
    maxBuffer: 10 * 1024 * 1024,
  });

const branchExists = async (branch: string) => {
  try {
    await execGit(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`]);
    return true;
  } catch {
    return false;
  }
};

const getCurrentHead = async () => {
  const { stdout } = await execGit(["rev-parse", "HEAD"]);
  return stdout.trim();
};

const getCurrentBranch = async () => {
  const { stdout } = await execGit(["branch", "--show-current"]);
  return stdout.trim();
};

const slugIssueTitle = (title: string) =>
  title
    .replace(/^\s*S\d+\s*:\s*/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean)
    .slice(0, 6)
    .join("-");

const canonicalIssueBranch = (issue: { id: string; title: string }) =>
  `sandcastle/issue-${issue.id}-${slugIssueTitle(issue.title)}`;

const getWorktreeForBranch = async (branch: string) => {
  const { stdout } = await execGit(["worktree", "list", "--porcelain"]);
  const blocks = stdout.trim().split(/\n\n+/).filter(Boolean);
  const ref = `refs/heads/${branch}`;

  for (const block of blocks) {
    const lines = block.split("\n");
    const worktreeLine = lines.find((line) => line.startsWith("worktree "));
    const branchLine = lines.find((line) => line.startsWith("branch "));

    if (branchLine?.slice("branch ".length) === ref && worktreeLine) {
      return worktreeLine.slice("worktree ".length);
    }
  }

  return undefined;
};

const getDirtyStatus = async (worktreePath: string) => {
  const { stdout } = await execGit(["status", "--porcelain"], {
    cwd: worktreePath,
  });
  return stdout.trim();
};

const countUniqueCommits = async (baseHead: string, branch: string) => {
  const { stdout } = await execGit([
    "rev-list",
    "--count",
    `${baseHead}..${branch}`,
  ]);
  return Number(stdout.trim());
};

const removeEmptyStaleBranch = async (branch: string, baseHead: string) => {
  if (!(await branchExists(branch))) return false;

  const uniqueCommits = await countUniqueCommits(baseHead, branch);
  if (uniqueCommits > 0) {
    console.log(
      `[branch:${branch}] keeping existing branch with ${uniqueCommits} unique commit(s).`,
    );
    return false;
  }

  const currentBranch = await getCurrentBranch();
  if (currentBranch === branch) {
    console.log(`[branch:${branch}] keeping branch because it is currently checked out.`);
    return false;
  }

  const worktreePath = await getWorktreeForBranch(branch);
  if (worktreePath) {
    const dirtyStatus = await getDirtyStatus(worktreePath);
    if (dirtyStatus) {
      console.log(
        `[branch:${branch}] keeping existing worktree with uncommitted changes at ${worktreePath}.`,
      );
      return false;
    }

    console.log(
      `[branch:${branch}] removing empty stale worktree before resetting to current HEAD.`,
    );
    await execGit(["worktree", "remove", "--force", worktreePath]);
  }

  console.log(`[branch:${branch}] resetting empty stale branch to current HEAD.`);
  await execGit(["branch", "-f", branch, baseHead]);
  return true;
};

const cleanupSiblingBranches = async (
  issue: { id: string; branch: string },
  baseHead: string,
) => {
  const { stdout } = await execGit([
    "for-each-ref",
    `refs/heads/sandcastle/issue-${issue.id}-*`,
    "--format=%(refname:short)",
  ]);
  const siblingBranches = stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((branch) => branch && branch !== issue.branch);

  for (const branch of siblingBranches) {
    const removed = await removeEmptyStaleBranch(branch, baseHead);
    if (removed) {
      await execGit(["branch", "-D", branch]);
      console.log(`[branch:${branch}] deleted obsolete planner slug variant.`);
    }
  }
};

const prepareIssueBranch = async (issue: { id: string; branch: string }) => {
  const baseHead = await getCurrentHead();
  await cleanupSiblingBranches(issue, baseHead);
  await removeEmptyStaleBranch(issue.branch, baseHead);
};

const checkGitHubBudget = async () => {
  const minCore = Number(HOST_ENV.SANDCASTLE_MIN_GH_CORE_REMAINING ?? 50);
  const minGraphql = Number(HOST_ENV.SANDCASTLE_MIN_GH_GRAPHQL_REMAINING ?? 50);

  const { stdout } = await execFileAsync(
    "gh",
    ["api", "rate_limit", "--jq", ".resources"],
    { env: HOST_ENV, maxBuffer: 1024 * 1024 },
  );
  const resources = JSON.parse(stdout) as {
    core?: { remaining: number; reset: number };
    graphql?: { remaining: number; reset: number };
  };

  const core = resources.core;
  const graphql = resources.graphql;
  const lowCore = core && core.remaining < minCore;
  const lowGraphql = graphql && graphql.remaining < minGraphql;

  if (lowCore || lowGraphql) {
    const parts = [
      core
        ? `core remaining ${core.remaining}, resets ${new Date(core.reset * 1000).toISOString()}`
        : "core unavailable",
      graphql
        ? `graphql remaining ${graphql.remaining}, resets ${new Date(graphql.reset * 1000).toISOString()}`
        : "graphql unavailable",
    ];

    throw new Error(
      `GitHub API budget is too low for a Sandcastle cycle (${parts.join(
        "; ",
      )}). Wait for reset or lower SANDCASTLE_MIN_GH_*_REMAINING for a smoke run.`,
    );
  }

  console.log(
    `GitHub API budget ok: core=${core?.remaining ?? "unknown"}, graphql=${
      graphql?.remaining ?? "unknown"
    }.`,
  );
};

const formatDuration = (startedAt: number) =>
  `${((Date.now() - startedAt) / 1000).toFixed(1)}s`;

const HOST_ENV = { ...process.env, ...(await readSandcastleEnv()) };

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// plan→execute→merge cycles before stopping. Override for a quick smoke test:
//   MAX_ITERATIONS=1 pnpm sandcastle
const MAX_ITERATIONS = Number(HOST_ENV.MAX_ITERATIONS ?? 10);

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
  CI: "1",
  COREPACK_ENABLE_PROJECT_SPEC: "0",
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
// --prefer-offline (not --offline): serve everything cached from the warm store,
// but fetch only NEW packages over the sandbox's default bridge network — so an
// issue that adds a dependency, and its downstream issues, run AFK without an
// image rebuild. --frozen-lockfile still pins exact versions. Rebuilds are now a
// perf re-warm, not a correctness requirement. See docs/agents/sandcastle.md.
const SANDCASTLE_INSTALL =
  `${SANDCASTLE_PNPM} install --prefer-offline --frozen-lockfile --config.enableGlobalVirtualStore=true --package-import-method=hardlink`;
// Bumped 10→20 min as headroom; the real fix for the parallel-install timeouts
// is serializeInstall below (installs no longer contend for macOS bind-mount I/O).
const SANDCASTLE_INSTALL_TIMEOUT_MS = 1_200_000;

// Serialize the per-sandbox install (the onSandboxReady hook). pnpm materializes
// ~1862 packages from the in-VM store into the bind-mounted worktree; on
// Docker-for-Mac the hardlink import falls back to a cross-device COPY, and
// running every planned issue's install at once saturates the file-sharing layer
// so all of them blow the hook timeout (observed 2026-06-09: 3× parallel → all
// three killed mid-link at "reused ~1500/1862", downloaded 0 — pure I/O, not
// network). Gate ONLY the install; sandbox.run (the agent) still runs in
// parallel, so AFK throughput is preserved while each install gets full I/O.
let installChain: Promise<unknown> = Promise.resolve();
const serializeInstall = <T>(fn: () => Promise<T>): Promise<T> => {
  const run = installChain.then(fn, fn);
  installChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
};
const SANDCASTLE_GIT_AUTH = "gh auth setup-git";
const IMPLEMENTER_IDLE_TIMEOUT_SECONDS = Number(
  HOST_ENV.SANDCASTLE_IMPLEMENTER_IDLE_TIMEOUT_SECONDS ?? 300,
);
const REVIEWER_IDLE_TIMEOUT_SECONDS = Number(
  HOST_ENV.SANDCASTLE_REVIEWER_IDLE_TIMEOUT_SECONDS ?? 180,
);
const MERGER_IDLE_TIMEOUT_SECONDS = Number(
  HOST_ENV.SANDCASTLE_MERGER_IDLE_TIMEOUT_SECONDS ?? 180,
);
const SETUP_LOG_COMMAND = `bash -lc 'set -euo pipefail; mkdir -p .sandcastle; { echo "[sandcastle-setup] $(date -Iseconds) install start"; ${SANDCASTLE_PNPM} config get store-dir; ${SANDCASTLE_INSTALL}; echo "[sandcastle-setup] $(date -Iseconds) db generate start"; ${SANDCASTLE_PNPM} --filter @auto-tm/db generate; echo "[sandcastle-setup] $(date -Iseconds) setup done"; } 2>&1 | tee .sandcastle/setup.log'`;

const implementerHooks = {
  sandbox: {
    onSandboxReady: [
      {
        command: SETUP_LOG_COMMAND,
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
        command: SETUP_LOG_COMMAND,
        timeoutMs: SANDCASTLE_INSTALL_TIMEOUT_MS,
      },
    ],
  },
};

// The planner only reads issues via `gh`/`git`; it needs no dependencies, so it
// runs without the install hook.

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);
  await checkGitHubBudget();

  // -------------------------------------------------------------------------
  // Phase 1: Plan
  //
  // One planner iteration: read the issue queue once, emit a plan, then let the
  // host script canonicalize branch names so planner slug drift cannot create
  // duplicate stale branches.
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
  const parsedPlan = JSON.parse(planJson) as {
    issues: { id: string; title: string; branch: string }[];
  };
  const issues = parsedPlan.issues.map((issue) => {
    const branch = canonicalIssueBranch(issue);
    if (issue.branch !== branch) {
      console.log(
        `Canonicalized planner branch for #${issue.id}: ${issue.branch} → ${branch}`,
      );
    }

    return { ...issue, branch };
  });

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
      await prepareIssueBranch(issue);
      const setupStartedAt = Date.now();
      console.log(
        `[${issue.id}] creating sandbox and running offline setup for ${issue.branch}...`,
      );
      const sandbox = await serializeInstall(() =>
        sandcastle.createSandbox({
          branch: issue.branch,
          sandbox: docker(),
          hooks: implementerHooks,
        }),
      );
      console.log(`[${issue.id}] sandbox ready in ${formatDuration(setupStartedAt)}.`);

      try {
        console.log(
          `[${issue.id}] implementer starting (idle timeout ${IMPLEMENTER_IDLE_TIMEOUT_SECONDS}s).`,
        );
        const implement = await sandbox.run({
          name: "implementer",
          maxIterations: 100,
          idleTimeoutSeconds: IMPLEMENTER_IDLE_TIMEOUT_SECONDS,
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
          console.log(
            `[${issue.id}] reviewer starting (idle timeout ${REVIEWER_IDLE_TIMEOUT_SECONDS}s).`,
          );
          const review = await sandbox.run({
            name: "reviewer",
            maxIterations: 1,
            idleTimeoutSeconds: REVIEWER_IDLE_TIMEOUT_SECONDS,
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
    idleTimeoutSeconds: MERGER_IDLE_TIMEOUT_SECONDS,
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
