import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { compactItem, executionSections, parseCommand, runCommand } from "./agent-github.mjs";

test("reads every grouped Execution state and ignores headings inside fences", () => {
  const body = "## Summary\nhello\n## Execution state for #1\n- **Status:** verifying\n```md\n## Evidence\n```\n- **Next action:** tests\n## Evidence\npass\n## Execution state for #2\n- **Status:** implementing\n";
  assert.deepEqual(executionSections(body), [
    { heading: "Execution state for #1", text: "- **Status:** verifying\n```md\n## Evidence\n```\n- **Next action:** tests" },
    { heading: "Execution state for #2", text: "- **Status:** implementing" },
  ]);
});

test("compact PR omits unrelated body and exposes truncation and actual check state", () => {
  const item = compactItem({ number: 42, title: "Example", body: "x".repeat(60000), headRefOid: "abc", statusCheckRollup: [{ name: "pr", status: "COMPLETED", conclusion: "FAILURE" }] }, "pr", 200);
  assert.equal(item.body, undefined);
  assert.deepEqual(item.checks, [{ name: "pr", state: "FAILURE" }]);
  assert.equal(item.head, "abc");
  const issue = compactItem({ body: "## Acceptance criteria\n- [ ] " + "x".repeat(1000) }, "issue", 200);
  assert.equal(issue.acceptance[0].text.length, 200);
  assert.equal(issue.acceptance[0].truncated, true);
});

test("rejects unsafe numbers, unknown flags and excessive comment history before invoking gh", () => {
  for (const args of [["issue", "-1"], ["pr", "12;echo"], ["issue", "2", "--surprise"], ["comments", "issue", "2", "--limit", "101"], ["queue", "--apply"]]) {
    assert.throws(() => parseCommand(args));
  }
});

test("bounded comments request only the last requested nodes and report missing history", () => {
  const calls = [];
  const result = runCommand(parseCommand(["comments", "pr", "42", "--limit", "2", "--max-chars", "200"]), {
    repo: "owner/repo", gh(args) { calls.push(args); return JSON.stringify({ data: { repository: { pullRequest: { comments: { totalCount: 15, nodes: [{ body: "x".repeat(500), url: "https://example.test/c" }], pageInfo: { hasPreviousPage: true } } } } } }); },
  });
  assert.match(calls[0].join(" "), /comments\(last: \$limit\)/);
  assert.ok(calls[0].includes("limit=2"));
  assert.equal(result.omittedComments, 14);
  assert.equal(result.comments[0].body.length, 200);
  assert.equal(result.comments[0].truncated, true);
});

test("comments are dry-run by default; apply preserves body-file text and avoids a shell", () => {
  const root = mkdtempSync(join(tmpdir(), "autotm-gh-"));
  const path = join(root, "body with spaces.md");
  const body = 'Line one\n\nLiteral $(touch /tmp/no) and `backticks`.\n';
  writeFileSync(path, body);
  const calls = [];
  const deps = { repo: "owner/repo", gh(args) { calls.push(args); assert.equal(readFileSync(args[args.indexOf("--body-file") + 1], "utf8"), body); return "https://example.test/comment\n"; } };
  try {
    const dry = runCommand(parseCommand(["comment", "issue", "42", "--body-file", path]), deps);
    assert.equal(dry.dryRun, true);
    assert.equal(calls.length, 0);
    const applied = runCommand(parseCommand(["comment", "issue", "42", "--body-file", path, "--apply"]), deps);
    assert.equal(applied.url, "https://example.test/comment");
    assert.equal(calls.length, 1);
    assert.ok(calls[0].includes(path));
    assert.equal(applied.body, undefined);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("creating an issue requires a title and nonempty body file, and returns a small receipt", () => {
  assert.throws(() => parseCommand(["create-issue", "--body-file", "/tmp/unused"]));
  const root = mkdtempSync(join(tmpdir(), "autotm-gh-"));
  const path = join(root, "body.md");
  writeFileSync(path, "");
  const deps = { repo: "owner/repo", gh: () => "https://example.test/issues/1" };
  try {
    const args = ["create-issue", "--title", "A task", "--body-file", path, "--label", "task", "--apply"];
    assert.throws(() => runCommand(parseCommand(args), deps), /empty/i);
    writeFileSync(path, "## Acceptance criteria\n- [ ] Works\n");
    const result = runCommand(parseCommand(args), deps);
    assert.equal(result.url, "https://example.test/issues/1");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("queue snapshots preserve pending checks and flag a possibly incomplete list", () => {
  const result = runCommand(parseCommand(["queue", "--limit", "1"]), {
    repo: "owner/repo", gh: () => JSON.stringify([{ number: 7, title: "Pending", statusCheckRollup: [{ name: "pr", status: "IN_PROGRESS", conclusion: "" }], body: "## Execution state\n- **Status:** verifying" }]),
  });
  assert.equal(result.possiblyMore, true);
  assert.deepEqual(result.prs[0].checks, [{ name: "pr", state: "IN_PROGRESS" }]);
  assert.equal(result.prs[0].execution[0].text, "- **Status:** verifying");
});

test("full bodies require explicit opt-in and GraphQL failures never become empty history", () => {
  const item = { number: 7, body: "## Context\nThe governing decision is in this section." };
  const deps = { repo: "owner/repo", gh: () => JSON.stringify(item) };
  assert.equal(runCommand(parseCommand(["issue", "7"]), deps).body, undefined);
  assert.equal(runCommand(parseCommand(["issue", "7", "--full"]), deps).body, item.body);
  assert.throws(() => runCommand(parseCommand(["comments", "issue", "7"]), { repo: "owner/repo", gh: () => JSON.stringify({ errors: [{ message: "Not authorized" }] }) }), /errors/);
});
