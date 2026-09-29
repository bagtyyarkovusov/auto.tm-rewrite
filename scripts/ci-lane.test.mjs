import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { chooseLane, laneFor } from "./ci-lane.mjs";

test("Markdown anywhere and any file under docs/ take the docs lane", () => {
  assert.equal(laneFor(["docs/adr/0065-x.md", "AGENTS.md", ".claude/skills/run-issue/SKILL.md"]), "docs");
  assert.equal(laneFor(["docs/design/mockup.html", "docs/design/logo.png"]), "docs");
});

test("any non-docs file takes the full lane", () => {
  assert.equal(laneFor(["docs/adr/0065-x.md", "apps/mobile/src/app.tsx"]), "full");
  assert.equal(laneFor([".github/workflows/pr-checks.yml"]), "full");
  assert.equal(laneFor(["package.json"]), "full");
  assert.equal(laneFor(["pnpm-lock.yaml"]), "full");
});

test("an empty change takes the full lane", () => {
  assert.equal(laneFor([]), "full");
});

function repo(t) {
  const cwd = mkdtempSync(join(tmpdir(), "ci-lane-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  git("init", "-q");
  git("config", "user.email", "ci@example.test");
  git("config", "user.name", "CI");
  git("config", "commit.gpgsign", "false");
  const commit = (files) => {
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(cwd, path)), { recursive: true });
      writeFileSync(join(cwd, path), content);
    }
    git("add", "-A");
    git("commit", "-q", "-m", "change");
    return git("rev-parse", "HEAD");
  };
  return { cwd, git, commit };
}

test("reads the lane from the commits between base and HEAD", (t) => {
  const { cwd, commit } = repo(t);
  const base = commit({ "src/app.ts": "one", "docs/a.md": "one" });
  commit({ "docs/a.md": "two", "README.md": "new" });
  assert.equal(chooseLane(base, cwd).lane, "docs");
  commit({ "src/app.ts": "two" });
  assert.equal(chooseLane(base, cwd).lane, "full");
});

test("moving code into docs/ is a code change", (t) => {
  const { cwd, git, commit } = repo(t);
  const base = commit({ "src/app.ts": "export const x = 1;\n".repeat(20), "docs/a.md": "one" });
  git("mv", "src/app.ts", "docs/app.ts");
  git("commit", "-q", "-m", "move");
  assert.equal(chooseLane(base, cwd).lane, "full");
});

test("a missing, all-zero, or unknown base takes the full lane", (t) => {
  const { cwd, commit } = repo(t);
  commit({ "docs/a.md": "one" });
  assert.equal(chooseLane(undefined, cwd).lane, "full");
  assert.equal(chooseLane("0000000000000000000000000000000000000000", cwd).lane, "full");
  const unknown = chooseLane("1234567890abcdef1234567890abcdef12345678", cwd);
  assert.equal(unknown.lane, "full");
  assert.match(unknown.reason, /could not list changed files/);
});

test("the command writes the lane to GITHUB_OUTPUT for the workflow", (t) => {
  const { cwd, commit } = repo(t);
  const base = commit({ "src/app.ts": "one" });
  commit({ "docs/a.md": "two" });
  const output = join(cwd, "github-output");
  const script = resolve(dirname(fileURLToPath(import.meta.url)), "ci-lane.mjs");
  execFileSync(process.execPath, [script, base], { cwd, env: { ...process.env, GITHUB_OUTPUT: output } });
  assert.equal(readFileSync(output, "utf8"), "lane=docs\n");
});
