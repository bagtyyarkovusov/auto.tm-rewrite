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
import { docker, defaultImageName } from "@ai-hero/sandcastle/sandboxes/docker";
import { exec, execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

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

// Agent: native Kimi Code CLI (the `kimi` npm package), not Claude Code pointed at
// Kimi's Anthropic-compatible endpoint. The CLI's documented KIMI_MODEL_* channel
// lets us inject the key at runtime without writing secrets into config.toml.
const MODEL = "kimi-for-coding";

const KIMI_CODE_ENV = {
  CI: "1",
  COREPACK_ENABLE_PROJECT_SPEC: "0",
  KIMI_DISABLE_TELEMETRY: "1",
  KIMI_CODE_HOME: "/home/agent/.kimi",
  KIMI_MODEL_NAME: MODEL,
  KIMI_MODEL_PROVIDER_TYPE: "kimi",
  KIMI_MODEL_BASE_URL: "https://api.kimi.com/coding/v1",
  KIMI_MODEL_MAX_CONTEXT_SIZE: "262144",
  KIMI_MODEL_CAPABILITIES: "thinking,tool_use,image_in",
  ...(HOST_ENV.KIMI_MODEL_API_KEY
    ? { KIMI_MODEL_API_KEY: HOST_ENV.KIMI_MODEL_API_KEY }
    : HOST_ENV.KIMI_API_KEY
      ? { KIMI_MODEL_API_KEY: HOST_ENV.KIMI_API_KEY }
      : {}),
};

process.env.KIMI_MODEL_NAME = process.env.KIMI_MODEL_NAME || MODEL;
process.env.KIMI_MODEL_PROVIDER_TYPE =
  process.env.KIMI_MODEL_PROVIDER_TYPE || "kimi";
process.env.KIMI_MODEL_BASE_URL =
  process.env.KIMI_MODEL_BASE_URL || "https://api.kimi.com/coding/v1";
process.env.KIMI_MODEL_MAX_CONTEXT_SIZE =
  process.env.KIMI_MODEL_MAX_CONTEXT_SIZE || "262144";
process.env.KIMI_MODEL_CAPABILITIES =
  process.env.KIMI_MODEL_CAPABILITIES || "thinking,tool_use,image_in";
process.env.KIMI_MODEL_API_KEY =
  process.env.KIMI_MODEL_API_KEY ||
  HOST_ENV.KIMI_MODEL_API_KEY ||
  HOST_ENV.KIMI_API_KEY;

const shellEscape = (value: string) => `'${value.replace(/'/g, "'\\''")}'`;

const kimiAgent = (_effort: "low" | "medium" = "low") =>
  ({
    ...sandcastle.kimiCode(MODEL, {
      thinking: true,
      env: KIMI_CODE_ENV,
    }),
    buildPrintCommand({ prompt, resumeSession }) {
      const resumeFlag = resumeSession
        ? ` --session ${shellEscape(resumeSession)}`
        : "";
      return {
        command: `kimi -p ${shellEscape(prompt)} --output-format stream-json${resumeFlag}`,
      };
    },
    buildInteractiveArgs({ prompt, dangerouslySkipPermissions }) {
      const args = ["kimi"];
      if (dangerouslySkipPermissions) args.push("--yolo");
      if (prompt) args.push(prompt);
      return args;
    },
  }) satisfies sandcastle.AgentProvider;

// ---------------------------------------------------------------------------
// Dependency strategy: copy-to-worktree (two-stage). See ADR-0033 +
// docs/agents/sandcastle.md.
//
// The old per-sandbox `pnpm install` materialized ~1,862 packages from the
// in-VM warm store INTO the macOS bind-mounted worktree; pnpm's hardlink import
// can't cross that mount (EXDEV) so it fell back to a cross-device COPY through
// Docker-for-Mac file sharing, saturating I/O and blowing even a serialized
// 40-min timeout. Instead:
//   Stage A: build a Linux node_modules tree ONCE per lockfile inside the warm
//            image (in-VM → real hardlinks, no EXDEV) and tar it out to
//            .sandcastle/linux-modules/.
//   Stage B: CoW-clone (APFS clonefile, metadata-only, host→host) that tree
//            into each worktree via Sandcastle's copyToWorktree + copyFromDir —
//            no install touches the bind mount.
//   Stage C: an optional, now-cheap top-up `pnpm install` reconciles per-branch
//            deltas (a branch that adds a dependency).
// ---------------------------------------------------------------------------

const SANDCASTLE_ENV = "CI=1 COREPACK_ENABLE_PROJECT_SPEC=0";
const SANDCASTLE_PNPM = `${SANDCASTLE_ENV} pnpm`;
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

// --- Stage A: materialize a Linux node_modules tree, once per lockfile -------

// The same image docker() resolves for this repo (e.g. sandcastle:auto.tm-rewrite),
// which bakes a warm pnpm store. Stage A installs against that store in-VM.
const WARM_IMAGE = defaultImageName(process.cwd());
const LINUX_MODULES_DIR = ".sandcastle/linux-modules";
const LOCKHASH_PATH = path.join(LINUX_MODULES_DIR, ".lockhash");
// prisma generate (run in Stage A) needs DATABASE_URL even though it never
// connects — a dummy satisfies prisma.config.ts. The real client is regenerated
// in-worktree by turbo `^build` at gate time, so it need not be copied.
const STAGE_A_DATABASE_URL =
  HOST_ENV.DATABASE_URL ??
  "postgresql://sandcastle:sandcastle@localhost:5432/sandcastle";

const lockfileHash = async () =>
  createHash("sha256")
    .update(await readFile("pnpm-lock.yaml"))
    .digest("hex");

const dockerExecEnvFlags = (env: Record<string, string>) =>
  Object.entries(env).flatMap(([k, v]) => ["-e", `${k}=${v}`]);

/**
 * Build (or refresh) .sandcastle/linux-modules/ — a self-contained Linux
 * node_modules set (root + every workspace package, all symlinks relative) that
 * Stage B clones into each worktree. No-ops when the lockfile is unchanged.
 */
const materializeLinuxModules = async (): Promise<void> => {
  const wantHash = await lockfileHash();
  const haveHash = (
    await readFile(LOCKHASH_PATH, "utf8").catch(() => "")
  ).trim();
  if (
    haveHash === wantHash &&
    existsSync(path.join(LINUX_MODULES_DIR, "node_modules"))
  ) {
    console.log(
      `[stage-a] linux-modules up to date (lock ${wantHash.slice(0, 12)}); skipping rebuild.`,
    );
    return;
  }

  console.log(
    `[stage-a] building Linux node_modules (lock ${wantHash.slice(0, 12)})…`,
  );
  const startedAt = Date.now();
  const BUILD = "/home/agent/build";

  // The image ENTRYPOINT is `sleep infinity`, so no command is needed.
  const { stdout: cidOut } = await execFileAsync(
    "docker",
    ["run", "-d", "--rm", WARM_IMAGE],
    { env: HOST_ENV },
  );
  const cid = cidOut.trim();

  try {
    await execFileAsync(
      "docker",
      ["exec", cid, "bash", "-lc", `rm -rf ${BUILD} && mkdir -p ${BUILD}`],
      { env: HOST_ENV },
    );

    // Seed the build dir with the committed tree (manifests + lockfile + vendor
    // tgz + prisma schema). node_modules is gitignored, so the archive is small.
    await execAsync(
      `git archive HEAD | docker exec -i ${cid} tar -x -C ${BUILD}`,
      { env: HOST_ENV, maxBuffer: 256 * 1024 * 1024 },
    );

    // Install offline against the warm store (in-VM → hardlinks, no EXDEV) and
    // generate the prisma client so any engine artifacts land in node_modules.
    await execFileAsync(
      "docker",
      [
        "exec",
        ...dockerExecEnvFlags({
          CI: "1",
          COREPACK_ENABLE_PROJECT_SPEC: "0",
          DATABASE_URL: STAGE_A_DATABASE_URL,
        }),
        cid,
        "bash",
        "-lc",
        `cd ${BUILD} && pnpm install --prefer-offline --frozen-lockfile && pnpm --filter @auto-tm/db generate`,
      ],
      { env: HOST_ENV, maxBuffer: 64 * 1024 * 1024 },
    );

    // Tar the node_modules set (root + each workspace's, pruning nested stores)
    // out to the host. GNU tar (-T -) in the container → bsdtar on macOS.
    await rm(LINUX_MODULES_DIR, { recursive: true, force: true });
    await mkdir(LINUX_MODULES_DIR, { recursive: true });
    await execAsync(
      `docker exec ${cid} bash -lc "cd ${BUILD} && find . -maxdepth 3 -type d -name node_modules -prune -print0 | tar --null -cf - -T -" | tar -C ${LINUX_MODULES_DIR} -xf -`,
      { env: HOST_ENV, maxBuffer: 256 * 1024 * 1024 },
    );

    await writeFile(LOCKHASH_PATH, wantHash + "\n");
    console.log(
      `[stage-a] linux-modules ready in ${((Date.now() - startedAt) / 1000).toFixed(0)}s.`,
    );
  } finally {
    await execFileAsync("docker", ["rm", "-f", cid], { env: HOST_ENV }).catch(
      () => {},
    );
  }
};

/** Relative paths under linux-modules to clone into each worktree: the root
 *  node_modules plus every workspace package's node_modules. */
const enumerateModulePaths = async (): Promise<string[]> => {
  const paths: string[] = [];
  if (existsSync(path.join(LINUX_MODULES_DIR, "node_modules"))) {
    paths.push("node_modules");
  }
  for (const group of ["apps", "packages"]) {
    const groupDir = path.join(LINUX_MODULES_DIR, group);
    if (!existsSync(groupDir)) continue;
    for (const name of await readdir(groupDir)) {
      const rel = path.join(group, name, "node_modules");
      if (existsSync(path.join(LINUX_MODULES_DIR, rel))) paths.push(rel);
    }
  }
  return paths;
};

// --- Stage B/C: copy modules into each worktree + optional top-up ------------

// Generous ceiling for the host-side CoW clone of the full module set.
const COPY_TO_WORKTREE_MS = Number(
  HOST_ENV.SANDCASTLE_COPY_TO_WORKTREE_MS ?? 900_000,
);

// Stage C top-up: a now-cheap `pnpm install` reconciling any per-branch delta on
// top of the cloned-in modules. The bulk is already clonefiled in, so pnpm only
// materializes what's missing. Default-on; set SANDCASTLE_TOPUP_INSTALL=0 to
// skip (ADR-0033 decision #4).
const TOPUP_INSTALL = HOST_ENV.SANDCASTLE_TOPUP_INSTALL !== "0";
const TOPUP_TIMEOUT_MS = Number(
  HOST_ENV.SANDCASTLE_TOPUP_TIMEOUT_MS ?? 600_000,
);
const topupHooks = TOPUP_INSTALL
  ? [
      {
        command: `bash -lc 'set -euo pipefail; ${SANDCASTLE_PNPM} install --prefer-offline --frozen-lockfile'`,
        timeoutMs: TOPUP_TIMEOUT_MS,
      },
    ]
  : [];

// Implementer/reviewer: just the optional top-up (modules arrive via the clone).
const implementerHooks = { sandbox: { onSandboxReady: [...topupHooks] } };

// Merger also runs the gate, so it gets the same modules; plus gh auth so it can
// push the merged HEAD over HTTPS without an interactive prompt.
const mergerHook = {
  sandbox: {
    onSandboxReady: [
      { command: SANDCASTLE_GIT_AUTH, timeoutMs: 30_000 },
      ...topupHooks,
    ],
  },
};

// The planner only reads issues via `gh`/`git`; it needs no dependencies, so it
// runs with neither the module clone nor a setup hook.

for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
  console.log(`\n=== Iteration ${iteration}/${MAX_ITERATIONS} ===\n`);
  // Retry up to 3 times with a 10s back-off — a single TLS handshake timeout
  // (common from behind the Great Firewall) should not abort the whole run.
  let budgetChecked = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await checkGitHubBudget();
      budgetChecked = true;
      break;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isNetwork = /TLS|timeout|ECONNRESET|ENOTFOUND|network/i.test(msg);
      if (isNetwork && attempt < 3) {
        console.warn(
          `[rate-limit] Network error on attempt ${attempt}/3, retrying in 10s: ${msg}`,
        );
        await new Promise((r) => setTimeout(r, 10_000));
      } else {
        throw err; // budget genuinely low, or 3rd network failure → abort
      }
    }
  }
  if (!budgetChecked) throw new Error("GitHub rate-limit check failed after 3 attempts.");

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
    agent: kimiAgent("low"),
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
  // Stage A: build the Linux node_modules tree once (no-op when the lockfile is
  // unchanged), then enumerate the dirs to clone into each worktree (Stage B).
  // -------------------------------------------------------------------------
  await materializeLinuxModules();
  const MODULE_PATHS = await enumerateModulePaths();
  if (MODULE_PATHS.length === 0) {
    throw new Error(
      `No node_modules found under ${LINUX_MODULES_DIR} after Stage A — ` +
        "check the warm-store image and the Stage A logs above.",
    );
  }
  console.log(
    `[stage-a] cloning ${MODULE_PATHS.length} module dir(s) into each worktree.`,
  );

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
        `[${issue.id}] creating sandbox + cloning modules for ${issue.branch}...`,
      );
      // Stage B: CoW-clone the prebuilt Linux modules into the worktree (no
      // install touches the bind mount). Stage C top-up runs via implementerHooks.
      const sandbox = await sandcastle.createSandbox({
        branch: issue.branch,
        sandbox: docker(),
        copyToWorktree: MODULE_PATHS,
        copyFromDir: LINUX_MODULES_DIR,
        timeouts: { copyToWorktreeMs: COPY_TO_WORKTREE_MS },
        hooks: implementerHooks,
      });
      console.log(`[${issue.id}] sandbox ready in ${formatDuration(setupStartedAt)}.`);

      try {
        console.log(
          `[${issue.id}] implementer starting (idle timeout ${IMPLEMENTER_IDLE_TIMEOUT_SECONDS}s).`,
        );
        const implement = await sandbox.run({
          name: "implementer",
          maxIterations: 100,
          idleTimeoutSeconds: IMPLEMENTER_IDLE_TIMEOUT_SECONDS,
          agent: kimiAgent("medium"),
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
            agent: kimiAgent("low"),
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
  // merge-to-head runs in a throwaway worktree; Stage B clones the modules into
  // it (copyToWorktree + copyFromDir) so the merger can run the gate.
  // -------------------------------------------------------------------------
  await sandcastle.run({
    hooks: mergerHook,
    sandbox: docker(),
    branchStrategy: { type: "merge-to-head" },
    copyToWorktree: MODULE_PATHS,
    copyFromDir: LINUX_MODULES_DIR,
    timeouts: { copyToWorktreeMs: COPY_TO_WORKTREE_MS },
    name: "merger",
    maxIterations: 1,
    idleTimeoutSeconds: MERGER_IDLE_TIMEOUT_SECONDS,
    agent: kimiAgent("low"),
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
