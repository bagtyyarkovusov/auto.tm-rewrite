#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const valid = `# AutoTM Domain Glossary\n\n## Listings\n\n**Listing**\n\nA vehicle offer published for marketplace discovery.\n`;

function createFixture(glossary, integrated = false) {
  const root = mkdtempSync(join(tmpdir(), "auto-tm-glossary-"));
  mkdirSync(join(root, "docs", "domain"), { recursive: true });
  writeFileSync(join(root, "docs", "domain", "GLOSSARY.md"), glossary);
  if (integrated) {
    mkdirSync(join(root, "docs", "adr"), { recursive: true });
    mkdirSync(join(root, ".github", "workflows"), { recursive: true });
    writeFileSync(join(root, "package.json"), JSON.stringify({ scripts: { "check:glossary": "node scripts/check-domain-glossary.mjs" } }));
    writeFileSync(join(root, "docs", "adr", "0042-domain-glossary-authority-and-mutability.md"), "`docs/domain/GLOSSARY.md`\n");
    writeFileSync(join(root, "docs", "adr", "README.md"), "[0042](0042-domain-glossary-authority-and-mutability.md)\n");
    for (const name of ["ci.yml", "pr-checks.yml"]) writeFileSync(join(root, ".github", "workflows", name), "- run: pnpm check:glossary\n");
  }
  return root;
}

function run(root, glossaryOnly = true) {
  const args = ["check:glossary", "--", "--root", root];
  if (glossaryOnly) args.push("--glossary-only");
  return spawnSync("pnpm", args, { cwd: repoRoot, encoding: "utf8" });
}

function withFixture(glossary, assertion, integrated = false) {
  const root = createFixture(glossary, integrated);
  try { assertion(root); } finally { rmSync(root, { recursive: true, force: true }); }
}

function failure(root, glossaryOnly = true) {
  const result = run(root, glossaryOnly);
  assert.notEqual(result.status, 0);
  return `${result.stdout}\n${result.stderr}`;
}

test("accepts one canonical term", () => withFixture(valid, (root) => {
  assert.match(execFileSync("pnpm", ["check:glossary", "--", "--root", root, "--glossary-only"], { cwd: repoRoot, encoding: "utf8" }), /Domain glossary: ok/);
}));

test("rejects duplicate canonical terms case-insensitively", () => withFixture(`${valid}\n## Cross-context\n\n**listing**\n\nA duplicate term.\n`, (root) => assert.match(failure(root), /duplicate canonical term "listing"/)));
test("rejects definitions longer than two sentences", () => withFixture(valid.replace("A vehicle offer published for marketplace discovery.", "One. Two. Three."), (root) => assert.match(failure(root), /must contain one or two sentences/)));
test("rejects missing definitions", () => withFixture(valid.replace("A vehicle offer published for marketplace discovery.", "_Avoid_: Advert"), (root) => assert.match(failure(root), /needs a definition/)));
test("rejects unknown headings", () => withFixture(valid.replace("## Listings", "## Payments"), (root) => assert.match(failure(root), /unknown glossary heading "Payments"/)));
test("rejects forbidden sections", () => withFixture(valid.replace("## Listings", "## Implementation status"), (root) => assert.match(failure(root), /forbidden glossary section/)));
test("rejects malformed entries", () => withFixture(valid.replace("**Listing**", "**Listing** — inline"), (root) => assert.match(failure(root), /malformed term entry/)));
test("rejects synonym and canonical collisions", () => withFixture(`${valid}\n_Avoid_: Advert\n\n## Cross-context\n\n**Advert**\n\nA promoted placement.\n`, (root) => assert.match(failure(root), /avoided synonym "Advert" collides/)));
test("accepts complete repository integration", () => withFixture(valid, (root) => assert.equal(run(root, false).status, 0), true));
test("rejects missing repository references", () => withFixture(valid, (root) => {
  const output = failure(root, false);
  assert.match(output, /package.json is missing the check:glossary script/);
  assert.match(output, /docs\/adr\/README.md is missing the ADR-0042 link/);
  assert.match(output, /.github\/workflows\/ci.yml is missing pnpm check:glossary/);
}));
test("rejects a broken ADR index reference", () => withFixture(valid, (root) => {
  writeFileSync(join(root, "docs", "adr", "README.md"), "[0042](0042-wrong.md)\n");
  assert.match(failure(root, false), /docs\/adr\/README.md is missing the ADR-0042 link/);
}, true));
