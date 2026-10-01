import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  classifyWorktree,
  findStaleBranches,
  findStaleRailwayEnvironments,
  formatReport,
  parseWorktreePorcelain,
  planApply,
  runApply,
} from "./worktree-gc.mjs";

const HOME = "/Users/dev";
const MAIN = "/Users/dev/Projects/auto.tm-rewrite";
const SHA = (n) => String(n).padStart(40, "a");

const PORCELAIN = [
  `worktree ${MAIN}`,
  `HEAD ${SHA(1)}`,
  "branch refs/heads/main",
  "",
  `worktree ${MAIN}/.claude/worktrees/agent-abc`,
  `HEAD ${SHA(2)}`,
  "branch refs/heads/worktree-agent-abc",
  "locked claude session issue-9 (pid 42 start Thu Oct 1 11:00:00 2026)",
  "",
  `worktree ${HOME}/.codex/queue-worktrees/q-1`,
  `HEAD ${SHA(3)}`,
  "detached",
  "",
  `worktree ${HOME}/.codex/worktrees/1b73/auto.tm-rewrite`,
  `HEAD ${SHA(4)}`,
  "detached",
  "locked",
  "",
  `worktree ${MAIN}/.claude/worktrees/gone`,
  `HEAD ${SHA(5)}`,
  "branch refs/heads/agent/issue-5",
  "prunable gitdir file points to non-existent location",
  "",
  `worktree ${MAIN}/.claude/worktrees/unborn`,
  `HEAD ${"0".repeat(40)}`,
  "branch refs/heads/agent/issue-6",
  "",
].join("\n");

test("parses git worktree list --porcelain into entries", () => {
  const entries = parseWorktreePorcelain(PORCELAIN);
  assert.equal(entries.length, 6);
  assert.deepEqual(entries[0], {
    path: MAIN,
    head: SHA(1),
    branch: "main",
    detached: false,
    bare: false,
    locked: false,
    lockReason: null,
    prunable: false,
  });
  assert.equal(entries[1].branch, "worktree-agent-abc");
  assert.equal(entries[1].locked, true);
  assert.equal(entries[1].lockReason, "claude session issue-9 (pid 42 start Thu Oct 1 11:00:00 2026)");
  assert.equal(entries[2].detached, true);
  assert.equal(entries[2].branch, null);
  assert.equal(entries[3].locked, true);
  assert.equal(entries[3].lockReason, "");
  assert.equal(entries[4].prunable, true);
  assert.equal(entries[5].head, "0".repeat(40));
});

const entry = (overrides = {}) => ({
  path: `${MAIN}/.claude/worktrees/issue-1`,
  head: SHA(10),
  branch: "agent/issue-1",
  detached: false,
  bare: false,
  locked: false,
  lockReason: null,
  prunable: false,
  ...overrides,
});

const pr = (overrides = {}) => ({
  number: 12,
  state: "MERGED",
  headRefName: "agent/issue-1",
  headRefOid: SHA(10),
  url: "https://github.com/o/r/pull/12",
  ...overrides,
});

const context = (overrides = {}) => ({
  mainPath: MAIN,
  currentPath: `${MAIN}/.claude/worktrees/self`,
  homeDir: HOME,
  dirtyCount: 0,
  activeProcesses: [],
  onMain: false,
  prs: [pr()],
  isAncestor: () => false,
  ...overrides,
});

test("a clean worktree at the head of a merged PR is removed", () => {
  const verdict = classifyWorktree(entry(), context());
  assert.equal(verdict.verdict, "remove");
  assert.equal(verdict.pr.number, 12);
  assert.match(verdict.reason, /PR #12 merged/);
});

test("a clean HEAD that is an ancestor of the merged PR head is removed", () => {
  const verdict = classifyWorktree(
    entry({ branch: null, detached: true, head: SHA(11) }),
    context({ isAncestor: (a, b) => a === SHA(11) && b === SHA(10) }),
  );
  assert.equal(verdict.verdict, "remove");
  assert.match(verdict.reason, /ancestor of PR #12/);
});

test("the main checkout is kept", () => {
  const verdict = classifyWorktree(entry({ path: MAIN, branch: "main" }), context());
  assert.deepEqual([verdict.verdict, verdict.reason], ["keep", "the main checkout"]);
});

test("a Codex app-managed worktree is kept", () => {
  const verdict = classifyWorktree(
    entry({ path: `${HOME}/.codex/worktrees/1b73/auto.tm-rewrite`, branch: null, detached: true }),
    context(),
  );
  assert.equal(verdict.verdict, "keep");
  assert.match(verdict.reason, /Codex app-managed worktree/);
});

test("a Codex queue worktree outside ~/.codex/worktrees is not treated as app-managed", () => {
  const verdict = classifyWorktree(
    entry({ path: `${HOME}/.codex/queue-worktrees/q-1` }),
    context(),
  );
  assert.equal(verdict.verdict, "remove");
});

test("the worktree running this script is kept", () => {
  const verdict = classifyWorktree(entry({ path: `${MAIN}/.claude/worktrees/self` }), context());
  assert.equal(verdict.verdict, "keep");
  assert.match(verdict.reason, /current session/);
});

test("a locked worktree is kept with its lock reason", () => {
  const verdict = classifyWorktree(entry({ locked: true, lockReason: "manual hold" }), context());
  assert.equal(verdict.verdict, "keep");
  assert.match(verdict.reason, /^locked: manual hold/);
});

test("a lock without a reason is still a lock", () => {
  const verdict = classifyWorktree(entry({ locked: true, lockReason: "" }), context());
  assert.equal(verdict.verdict, "keep");
  assert.match(verdict.reason, /^locked/);
});

test("a worktree locked by another Claude session is kept as that session's", () => {
  const verdict = classifyWorktree(
    entry({ locked: true, lockReason: "claude session issue-9 (pid 42 start Thu Oct 1 11:00:00 2026)" }),
    context(),
  );
  assert.equal(verdict.verdict, "keep");
  assert.match(verdict.reason, /another session's worktree/);
});

test("a worktree with a running process inside it is kept as a running agent", () => {
  const verdict = classifyWorktree(
    entry(),
    context({
      activeProcesses: [{ pid: 77, command: "claude", cwd: `${MAIN}/.claude/worktrees/issue-1/apps/mobile` }],
    }),
  );
  assert.equal(verdict.verdict, "keep");
  assert.match(verdict.reason, /running agent: pid 77 \(claude\)/);
});

test("a process in a sibling directory with the same prefix does not count", () => {
  const verdict = classifyWorktree(
    entry(),
    context({ activeProcesses: [{ pid: 77, command: "node", cwd: `${MAIN}/.claude/worktrees/issue-10` }] }),
  );
  assert.equal(verdict.verdict, "remove");
});

test("a dirty tree is kept with its entry count", () => {
  const verdict = classifyWorktree(entry(), context({ dirtyCount: 3 }));
  assert.deepEqual([verdict.verdict, verdict.reason], ["keep", "dirty tree (3 changed paths)"]);
});

test("an unreadable status is kept, never treated as clean", () => {
  const verdict = classifyWorktree(entry(), context({ dirtyCount: null }));
  assert.equal(verdict.verdict, "keep");
  assert.match(verdict.reason, /status could not be read/);
});

test("an open PR keeps the worktree", () => {
  const verdict = classifyWorktree(entry(), context({ prs: [pr({ state: "OPEN" })] }));
  assert.deepEqual([verdict.verdict, verdict.reason], ["keep", "PR #12 is open"]);
});

test("a closed unmerged PR keeps the worktree", () => {
  const verdict = classifyWorktree(entry(), context({ prs: [pr({ state: "CLOSED" })] }));
  assert.deepEqual([verdict.verdict, verdict.reason], ["keep", "PR #12 closed without merging"]);
});

test("an open PR wins over a merged PR that also matches", () => {
  const verdict = classifyWorktree(
    entry(),
    context({ prs: [pr({ number: 3, state: "MERGED" }), pr({ number: 4, state: "OPEN" })] }),
  );
  assert.equal(verdict.verdict, "keep");
  assert.match(verdict.reason, /PR #4 is open/);
});

test("no PR match keeps the worktree", () => {
  const verdict = classifyWorktree(entry(), context({ prs: [] }));
  assert.equal(verdict.verdict, "keep");
  assert.match(verdict.reason, /^no PR match/);
});

test("commits after the PR head are not matched, so they are never lost", () => {
  const verdict = classifyWorktree(
    entry({ head: SHA(99) }),
    context({ isAncestor: () => false }),
  );
  assert.equal(verdict.verdict, "keep");
  assert.match(verdict.reason, /^no PR match/);
});

test("an ancestor check that cannot be answered is no match", () => {
  const verdict = classifyWorktree(
    entry({ head: SHA(99), branch: null, detached: true }),
    context({ isAncestor: () => null }),
  );
  assert.equal(verdict.verdict, "keep");
  assert.match(verdict.reason, /^no PR match/);
});

test("a detached HEAD already on main is not matched to a PR by ancestry", () => {
  const verdict = classifyWorktree(
    entry({ head: SHA(11), branch: null, detached: true }),
    context({ onMain: true, isAncestor: () => true }),
  );
  assert.equal(verdict.verdict, "keep");
  assert.match(verdict.reason, /^no PR match/);
});

test("an unborn branch is kept", () => {
  const verdict = classifyWorktree(entry({ head: "0".repeat(40) }), context());
  assert.deepEqual([verdict.verdict, verdict.reason], ["keep", "unborn branch"]);
});

test("evidence, prototype and research branches are kept even when their PR merged", () => {
  for (const branch of ["evidence/mobile-results", "agent/prototype-search", "research/ci", "x/issue-9-evidence"]) {
    const verdict = classifyWorktree(entry({ branch }), context({ prs: [pr({ headRefName: branch })] }));
    assert.equal(verdict.verdict, "keep", branch);
    assert.match(verdict.reason, /evidence, prototype or research/, branch);
  }
});

test("a directory named for evidence keeps a detached worktree", () => {
  const verdict = classifyWorktree(
    entry({ path: `${MAIN}/.claude/worktrees/prototype-filters`, branch: null, detached: true }),
    context(),
  );
  assert.equal(verdict.verdict, "keep");
  assert.match(verdict.reason, /evidence, prototype or research/);
});

test("a branch like research-free names is not caught by substring accident", () => {
  const verdict = classifyWorktree(entry({ branch: "agent/issue-1-evidenceless" }), context());
  assert.equal(verdict.verdict, "remove");
});

test("a prunable entry with a missing directory is kept for git worktree prune", () => {
  const verdict = classifyWorktree(entry({ prunable: true }), context());
  assert.equal(verdict.verdict, "keep");
  assert.match(verdict.reason, /directory is missing/);
});

test("the first matching keep reason wins, so a locked dirty worktree reports its lock", () => {
  const verdict = classifyWorktree(entry({ locked: true, lockReason: "hold" }), context({ dirtyCount: 5 }));
  assert.match(verdict.reason, /^locked/);
});

test("stale branches are task and scaffold branches with no worktree whose tip is in a merged PR head", () => {
  const worktrees = [entry({ branch: "agent/issue-1" })];
  const branches = [
    { name: "agent/issue-1", sha: SHA(10) },
    { name: "agent/issue-2", sha: SHA(20) },
    { name: "agent/issue-3", sha: SHA(30) },
    { name: "worktree-agent-abc", sha: SHA(40) },
    { name: "worktree-agent-def", sha: SHA(50) },
    { name: "main", sha: SHA(60) },
    { name: "claude/other", sha: SHA(70) },
  ];
  const prs = [
    pr({ number: 20, headRefName: "agent/issue-2", headRefOid: SHA(20), state: "MERGED" }),
    pr({ number: 30, headRefName: "agent/issue-3", headRefOid: SHA(31), state: "OPEN" }),
    pr({ number: 40, headRefName: "x", headRefOid: SHA(41), state: "MERGED" }),
    pr({ number: 70, headRefName: "claude/other", headRefOid: SHA(70), state: "MERGED" }),
  ];
  const stale = findStaleBranches({
    branches,
    worktrees,
    prs,
    isAncestor: (a, b) => (a === SHA(40) && b === SHA(41)) || (a === SHA(30) && b === SHA(31)),
  });
  assert.deepEqual(
    stale.map((item) => [item.name, item.sha, item.pr.number]),
    [
      ["agent/issue-2", SHA(20), 20],
      ["worktree-agent-abc", SHA(40), 40],
    ],
  );
});

test("stale Railway environments are PR environments whose PR is closed", () => {
  const environments = [
    { id: "1", name: "staging", isEphemeral: false },
    { id: "2", name: "production", isEphemeral: false },
    { id: "3", name: "auto.tm-rewrite-pr-12", isEphemeral: true, meta: { prNumber: 12 } },
    { id: "4", name: "auto.tm-rewrite-pr-13", isEphemeral: true, meta: { prNumber: 13 } },
    { id: "5", name: "auto.tm-rewrite-pr-14", isEphemeral: true, meta: { prNumber: 14 } },
    { id: "6", name: "auto.tm-rewrite-pr-15", isEphemeral: true },
  ];
  const prs = [
    pr({ number: 12, state: "MERGED" }),
    pr({ number: 13, state: "OPEN" }),
    pr({ number: 15, state: "CLOSED" }),
  ];
  const result = findStaleRailwayEnvironments({ environments, prs });
  assert.deepEqual(
    result.closed.map((item) => [item.name, item.prNumber, item.prState]),
    [
      ["auto.tm-rewrite-pr-12", 12, "MERGED"],
      ["auto.tm-rewrite-pr-15", 15, "CLOSED"],
    ],
  );
  assert.deepEqual(result.unknown.map((item) => item.name), ["auto.tm-rewrite-pr-14"]);
});

const row = (overrides) => ({
  entry: entry(),
  verdict: { verdict: "remove", reason: "PR #12 merged", pr: pr() },
  ...overrides,
});

test("the apply plan removes only remove rows, without force", () => {
  const rows = [
    row(),
    row({
      entry: entry({ path: "/w/dirty", branch: "agent/issue-2", head: SHA(20) }),
      verdict: { verdict: "keep", reason: "dirty tree (1 changed paths)", pr: null },
    }),
  ];
  const steps = planApply({ rows, staleBranches: [] });
  const removes = steps.filter((step) => step.argv.slice(0, 3).join(" ") === "git worktree remove");
  assert.deepEqual(removes.map((step) => step.argv[3]), [entry().path]);
  for (const step of steps) {
    assert.ok(!step.argv.includes("--force"), step.argv.join(" "));
    assert.ok(!step.argv.includes("-f"), step.argv.join(" "));
    assert.ok(!step.argv.includes("-D"), step.argv.join(" "));
  }
  assert.deepEqual(steps.at(-1).argv, ["git", "worktree", "prune"]);
});

test("the apply plan deletes refs only conditionally on the expected sha", () => {
  const rows = [
    row(),
    row({
      entry: entry({ path: "/w/scaffold", branch: "worktree-agent-abc", head: SHA(40) }),
      verdict: { verdict: "remove", reason: "PR #40 merged", pr: pr({ number: 40, headRefOid: SHA(40) }) },
    }),
    row({
      entry: entry({ path: "/w/other", branch: "claude/handoff", head: SHA(50) }),
      verdict: { verdict: "remove", reason: "PR #50 merged", pr: pr({ number: 50, headRefOid: SHA(50) }) },
    }),
    row({
      entry: entry({ path: "/w/detached", branch: null, detached: true, head: SHA(60) }),
      verdict: { verdict: "remove", reason: "PR #60 merged", pr: pr({ number: 60, headRefOid: SHA(60) }) },
    }),
  ];
  const staleBranches = [{ name: "agent/issue-9", sha: SHA(90), pr: pr({ number: 9 }) }];
  const steps = planApply({ rows, staleBranches });
  const deletes = steps.filter((step) => step.argv[1] === "update-ref");
  assert.deepEqual(
    deletes.map((step) => step.argv),
    [
      ["git", "update-ref", "-d", "refs/heads/agent/issue-1", SHA(10)],
      ["git", "update-ref", "-d", "refs/heads/worktree-agent-abc", SHA(40)],
      ["git", "update-ref", "-d", "refs/heads/agent/issue-9", SHA(90)],
    ],
  );
  const lastRemove = Math.max(...steps.map((step, i) => (step.argv[1] === "worktree" && step.argv[2] === "remove" ? i : -1)));
  const firstDelete = steps.findIndex((step) => step.argv[1] === "update-ref");
  assert.ok(lastRemove < firstDelete, "worktrees are removed before refs are deleted");
});

test("the apply plan never removes a kept worktree even if handed one with a stale pr", () => {
  const steps = planApply({
    rows: [row({ verdict: { verdict: "keep", reason: "PR #12 is open", pr: pr({ state: "OPEN" }) } })],
    staleBranches: [],
  });
  assert.deepEqual(steps.map((step) => step.argv.join(" ")), ["git worktree prune"]);
});

test("applying stops at the first failure and reports what was done", () => {
  const steps = [
    { label: "one", argv: ["git", "a"] },
    { label: "two", argv: ["git", "b"] },
    { label: "three", argv: ["git", "c"] },
  ];
  const seen = [];
  const result = runApply(steps, (argv) => {
    seen.push(argv.join(" "));
    if (argv[1] === "b") throw new Error("fatal: contains modified or untracked files");
  });
  assert.deepEqual(seen, ["git a", "git b"]);
  assert.deepEqual(result.done.map((step) => step.label), ["one"]);
  assert.equal(result.failed.step.label, "two");
  assert.match(result.failed.error, /modified or untracked files/);
  assert.deepEqual(result.skipped.map((step) => step.label), ["three"]);
});

test("the report names the verdict and exact keep reason for every worktree", () => {
  const text = formatReport({
    rows: [
      {
        entry: entry({ path: "/w/a" }),
        size: "1.5 GB",
        dirtyCount: 0,
        verdict: { verdict: "remove", reason: "PR #12 merged", pr: pr() },
      },
      {
        entry: entry({ path: "/w/b", branch: null, detached: true }),
        size: "20 MB",
        dirtyCount: 2,
        verdict: { verdict: "keep", reason: "dirty tree (2 changed paths)", pr: null },
      },
    ],
    staleBranches: [{ name: "agent/issue-9", sha: SHA(90), pr: pr({ number: 9 }) }],
    railway: { closed: [{ name: "auto.tm-rewrite-pr-12", prNumber: 12, prState: "MERGED" }], unknown: [] },
    applied: null,
  });
  assert.match(text, /\/w\/a/);
  assert.match(text, /remove/);
  assert.match(text, /keep: dirty tree \(2 changed paths\)/);
  assert.match(text, /agent\/issue-9/);
  assert.match(text, /auto\.tm-rewrite-pr-12/);
  assert.match(text, /read-only/i);
});

// --- command line, against a real temporary repository ---------------------

const script = resolve(dirname(fileURLToPath(import.meta.url)), "worktree-gc.mjs");

function fixtureRepo(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "worktree-gc-")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const main = join(root, "main");
  mkdirSync(main);
  const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  git(main, "init", "-q", "-b", "main");
  git(main, "config", "user.email", "gc@example.test");
  git(main, "config", "user.name", "GC");
  git(main, "config", "commit.gpgsign", "false");
  writeFileSync(join(main, "a.txt"), "a\n");
  git(main, "add", "a.txt");
  git(main, "commit", "-q", "-m", "base");
  const addWorktree = (name, branch) => {
    const path = join(root, name);
    git(main, "worktree", "add", "-q", "-b", branch, path);
    writeFileSync(join(path, `${name}.txt`), `${name}\n`);
    git(path, "add", `${name}.txt`);
    git(path, "commit", "-q", "-m", name);
    return { path, head: git(path, "rev-parse", "HEAD") };
  };
  const merged = addWorktree("merged", "agent/issue-1");
  const dirty = addWorktree("dirty", "agent/issue-2");
  writeFileSync(join(dirty.path, "scratch.txt"), "uncommitted\n");
  const open = addWorktree("open", "agent/issue-3");
  const locked = addWorktree("locked", "agent/issue-4");
  git(main, "worktree", "lock", "--reason", "held by test", locked.path);
  const prs = [
    { number: 1, state: "MERGED", headRefName: "agent/issue-1", headRefOid: merged.head, url: "u/1" },
    { number: 2, state: "MERGED", headRefName: "agent/issue-2", headRefOid: dirty.head, url: "u/2" },
    { number: 3, state: "OPEN", headRefName: "agent/issue-3", headRefOid: open.head, url: "u/3" },
    { number: 4, state: "MERGED", headRefName: "agent/issue-4", headRefOid: locked.head, url: "u/4" },
  ];
  const prsFile = join(root, "prs.json");
  writeFileSync(prsFile, JSON.stringify(prs));
  const snapshot = () =>
    [git(main, "worktree", "list", "--porcelain"), git(main, "for-each-ref", "--format=%(refname) %(objectname)")].join("\n");
  return { root, main, git, merged, dirty, open, locked, prsFile, snapshot };
}

const gc = (cwd, ...args) =>
  spawnSync("node", [script, ...args, "--no-railway", "--no-size"], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, HOME: cwd },
  });

test("the default run is read-only and reports every worktree", (t) => {
  const repo = fixtureRepo(t);
  const before = repo.snapshot();
  const result = gc(repo.main, "--prs-file", repo.prsFile);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(repo.snapshot(), before, "no worktree or ref changed");
  assert.match(result.stdout, /read-only/i);
  assert.match(result.stdout, /keep: dirty tree \(1 changed paths\)/);
  assert.match(result.stdout, /keep: PR #3 is open/);
  assert.match(result.stdout, /keep: locked: held by test/);
  assert.match(result.stdout, /keep: the main checkout/);
  assert.match(result.stdout, new RegExp(`${repo.merged.path}[^\\n]*\\n?[^\\n]*remove`));
});

test("--apply removes only the passing worktree and its task branch", (t) => {
  const repo = fixtureRepo(t);
  const result = gc(repo.main, "--apply", "--prs-file", repo.prsFile);
  assert.equal(result.status, 0, result.stderr);
  const list = repo.git(repo.main, "worktree", "list", "--porcelain");
  assert.ok(!list.includes(repo.merged.path), "merged worktree removed");
  for (const kept of [repo.dirty, repo.open, repo.locked]) assert.ok(list.includes(kept.path), kept.path);
  const branches = repo.git(repo.main, "branch", "--format=%(refname:short)").split("\n");
  assert.ok(!branches.includes("agent/issue-1"), "task branch deleted");
  for (const kept of ["agent/issue-2", "agent/issue-3", "agent/issue-4", "main"]) assert.ok(branches.includes(kept), kept);
  assert.match(result.stdout, /removed/i);
});

test("--apply refuses a dirty worktree even when its PR merged", (t) => {
  const repo = fixtureRepo(t);
  const result = gc(repo.main, "--apply", "--prs-file", repo.prsFile);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    execFileSync("git", ["status", "--porcelain"], { cwd: repo.dirty.path, encoding: "utf8" }).trim(),
    "?? scratch.txt",
  );
  assert.match(result.stdout, /keep: dirty tree/);
});
