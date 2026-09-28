import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("dispatch exits before credentials or SDK orchestration can run", () => {
  const entry = readFileSync(join(root, ".sandcastle/main.mts"), "utf8");
  const firstStatement = entry.replace(/^\s*\/\/[^\n]*\n/gm, "").trimStart();
  // Fail before executing anything if the guard is moved behind other imports.
  assert.ok(firstStatement.startsWith('import "./dispatch-suspended.mjs";'));
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.equal(pkg.scripts.sandcastle, "tsx .sandcastle/main.mts");
  const cwd = mkdtempSync(join(tmpdir(), "autotm-suspension-"));
  try {
    const result = spawnSync(process.execPath, [join(root, "node_modules/tsx/dist/cli.mjs"), join(root, ".sandcastle/main.mts")], {
      cwd, env: { PATH: process.env.PATH }, encoding: "utf8", timeout: 10_000,
    });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /dispatch is suspended pending #406/);
    assert.equal(result.stdout, "");
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});
