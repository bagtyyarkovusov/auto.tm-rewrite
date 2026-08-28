#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const valid = `# AutoTM Domain Glossary\n\nGoverned by [ADR-0042](../adr/0042-domain-glossary-authority-and-mutability.md).\n\n## Listings\n\n**Listing**\n\nA vehicle offer published for marketplace discovery.\n`;

function createFixture(glossary) {
  const root = mkdtempSync(join(tmpdir(), "auto-tm-glossary-"));
  mkdirSync(join(root, "docs", "domain"), { recursive: true });
  mkdirSync(join(root, "docs", "adr"), { recursive: true });
  mkdirSync(join(root, "docs", "agents"), { recursive: true });
  mkdirSync(join(root, ".claude", "skills", "shape-with-docs"), { recursive: true });
  mkdirSync(join(root, ".claude", "skills", "create-sprint-issues"), { recursive: true });
  mkdirSync(join(root, ".claude", "skills", "run-issue"), { recursive: true });
  mkdirSync(join(root, ".github", "workflows"), { recursive: true });
  writeFileSync(join(root, "docs", "domain", "GLOSSARY.md"), glossary);
  writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { "check:glossary": "node scripts/check-domain-glossary.mjs" } }));
  writeFileSync(join(root, "docs", "adr", "0042-domain-glossary-authority-and-mutability.md"), [
    "[`docs/domain/GLOSSARY.md`](../domain/GLOSSARY.md)",
    "[ADR-0019](0019-context-md-describes-current-state.md)",
    "[ADR-0020](0020-document-hierarchy-and-mutability.md)",
    "[ADR-0040](0040-repo-canonical-workflow-skills.md)",
  ].join("\n"));
  for (const name of ["0019-context-md-describes-current-state.md", "0020-document-hierarchy-and-mutability.md", "0040-repo-canonical-workflow-skills.md"]) {
    writeFileSync(join(root, "docs", "adr", name), "fixture\n");
  }
  writeFileSync(join(root, "docs", "adr", "README.md"), "[0042](0042-domain-glossary-authority-and-mutability.md)\n");
  writeFileSync(join(root, ".claude", "skills", "shape-with-docs", "SKILL.md"), [
    "[Glossary](../../../docs/domain/GLOSSARY.md)",
    "[ADR-0019](../../../docs/adr/0019-context-md-describes-current-state.md)",
    "[ADR-0020](../../../docs/adr/0020-document-hierarchy-and-mutability.md)",
    "[ADR-0042](../../../docs/adr/0042-domain-glossary-authority-and-mutability.md)",
    "[Workflow](../../../docs/agents/coding-workflow.md)",
  ].join("\n"));
  for (const name of ["create-sprint-issues", "run-issue"]) {
    writeFileSync(join(root, ".claude", "skills", name, "SKILL.md"), "fixture\n");
  }
  writeFileSync(join(root, "docs", "agents", "coding-workflow.md"), [
    "[Glossary](../domain/GLOSSARY.md)",
    "[Shape](../../.claude/skills/shape-with-docs/SKILL.md)",
    "[Specify and create tickets](../../.claude/skills/create-sprint-issues/SKILL.md)",
    "[Implement and review](../../.claude/skills/run-issue/SKILL.md)",
  ].join("\n"));
  writeFileSync(join(root, "docs", "agents", "domain.md"), "[Glossary](../domain/GLOSSARY.md)\n");
  for (const name of ["AGENTS.md", "CLAUDE.md"]) {
    writeFileSync(join(root, name), "[Glossary](docs/domain/GLOSSARY.md)\n[Workflow](docs/agents/coding-workflow.md)\n");
  }
  for (const name of ["ci.yml", "pr-checks.yml"]) writeFileSync(join(root, ".github", "workflows", name), "- run: pnpm check:glossary\n");
  return root;
}

function run(root) {
  const args = ["check:glossary", "--", "--root", root];
  return spawnSync("pnpm", args, { cwd: repoRoot, encoding: "utf8" });
}

function withFixture(glossary, assertion) {
  const root = createFixture(glossary);
  try { assertion(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

function failure(root) {
  const result = run(root);
  assert.notEqual(result.status, 0);
  return `${result.stdout}\n${result.stderr}`;
}

test("accepts one canonical term", () => withFixture(valid, (root) => {
  assert.match(execFileSync("pnpm", ["check:glossary", "--", "--root", root], { cwd: repoRoot, encoding: "utf8" }), /Domain glossary: ok/);
}));

test("rejects the removed glossary-only test interface", () => withFixture(valid, (root) => {
  const result = spawnSync("pnpm", ["check:glossary", "--", "--root", root, "--glossary-only"], { cwd: repoRoot, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /unknown argument "--glossary-only"/);
}));

test("rejects duplicate canonical terms case-insensitively", () => withFixture(`${valid}\n## Cross-context\n\n**listing**\n\nA duplicate term.\n`, (root) => assert.match(failure(root), /duplicate canonical term "listing"/)));
test("rejects definitions longer than two sentences", () => withFixture(valid.replace("A vehicle offer published for marketplace discovery.", "One. Two. Three."), (root) => assert.match(failure(root), /must contain one or two sentences/)));
test("rejects definitions longer than 240 characters", () => withFixture(valid.replace("A vehicle offer published for marketplace discovery.", `${"A".repeat(240)}.`), (root) => assert.match(failure(root), /must be 240 characters or fewer/)));
test("rejects missing definitions", () => withFixture(valid.replace("A vehicle offer published for marketplace discovery.", "_Avoid_: Advert"), (root) => assert.match(failure(root), /needs a definition/)));
test("rejects unknown headings", () => withFixture(valid.replace("## Listings", "## Payments"), (root) => assert.match(failure(root), /unknown glossary heading "Payments"/)));
test("rejects forbidden sections", () => withFixture(valid.replace("## Listings", "## Implementation status"), (root) => assert.match(failure(root), /forbidden glossary section/)));
test("rejects malformed entries", () => withFixture(valid.replace("**Listing**", "**Listing** — inline"), (root) => assert.match(failure(root), /malformed term entry/)));
test("rejects synonym and canonical collisions", () => withFixture(`${valid}\n_Avoid_: Advert\n\n## Cross-context\n\n**Advert**\n\nA promoted placement.\n`, (root) => assert.match(failure(root), /avoided synonym "Advert" collides/)));
test("accepts complete repository integration", () => withFixture(valid, (root) => assert.equal(run(root).status, 0)));
test("rejects missing repository references", () => withFixture(valid, (root) => {
  writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: {} }));
  writeFileSync(join(root, "docs", "adr", "README.md"), "");
  writeFileSync(join(root, ".github", "workflows", "ci.yml"), "");
  const output = failure(root);
  assert.match(output, /package.json is missing the check:glossary script/);
  assert.match(output, /docs\/adr\/README.md is missing the ADR-0042 link/);
  assert.match(output, /.github\/workflows\/ci.yml is missing pnpm check:glossary/);
}));
test("rejects a broken ADR index reference", () => withFixture(valid, (root) => {
  writeFileSync(join(root, "docs", "adr", "README.md"), "[0042-domain-glossary-authority-and-mutability.md](0042-wrong.md)\n");
  assert.match(failure(root), /docs\/adr\/README.md is missing the ADR-0042 link/);
}));
test("rejects a broken glossary governance link", () => withFixture(valid.replace("(../adr/0042-domain-glossary-authority-and-mutability.md)", "(../adr/0042-wrong.md)"), (root) => {
  assert.match(failure(root), /docs\/domain\/GLOSSARY.md is missing its ADR-0042 link/);
}));
test("rejects a broken governing ADR link", () => withFixture(valid, (root) => {
  const adrPath = join(root, "docs", "adr", "0042-domain-glossary-authority-and-mutability.md");
  writeFileSync(adrPath, [
    "[`docs/domain/GLOSSARY.md`](../domain/GLOSSARY.md)",
    "[0019-context-md-describes-current-state.md](0019-wrong.md)",
    "[ADR-0020](0020-document-hierarchy-and-mutability.md)",
    "[ADR-0040](0040-repo-canonical-workflow-skills.md)",
  ].join("\n"));
  assert.match(failure(root), /ADR-0042 has a broken ADR-0019 link/);
}));
test("rejects a missing shaping workflow", () => withFixture(valid, (root) => {
  rmSync(join(root, ".claude", "skills", "shape-with-docs", "SKILL.md"));
  assert.match(failure(root), /shape-with-docs is missing its glossary link/);
}));
test("rejects a broken workflow-router glossary link", () => withFixture(valid, (root) => {
  writeFileSync(join(root, "docs", "agents", "coding-workflow.md"), [
    "[Glossary](../domain/GLOSSARY-wrong.md)",
    "[Shape](../../.claude/skills/shape-with-docs/SKILL.md)",
    "[Specify and create tickets](../../.claude/skills/create-sprint-issues/SKILL.md)",
    "[Implement and review](../../.claude/skills/run-issue/SKILL.md)",
  ].join("\n"));
  assert.match(failure(root), /coding workflow is missing its glossary link/);
}));
