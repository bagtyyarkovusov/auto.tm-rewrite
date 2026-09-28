#!/usr/bin/env node
// Chooses the CI lane for the change between a base commit and HEAD. The
// lane is "docs" only when every changed path is Markdown or lives under
// docs/. Anything else, including a base that cannot be read, is "full".
// Usage: node scripts/ci-lane.mjs <base-commit>
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export function isDocsPath(path) {
  return path.startsWith("docs/") || path.endsWith(".md");
}

export function laneFor(paths) {
  return paths.length > 0 && paths.every(isDocsPath) ? "docs" : "full";
}

// --no-renames lists both sides of a rename, so moving code into docs/ is
// still a code change.
export function changedPaths(base, cwd) {
  const output = execFileSync("git", ["diff", "--name-only", "--no-renames", "-z", base, "HEAD"], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return output.split("\0").filter(Boolean);
}

export function chooseLane(base, cwd) {
  // A push that creates a branch reports an all-zero "before" commit.
  if (!base || /^0+$/.test(base)) {
    return { lane: "full", reason: "no base commit" };
  }
  try {
    const paths = changedPaths(base, cwd);
    return { lane: laneFor(paths), paths };
  } catch (error) {
    return { lane: "full", reason: `could not list changed files: ${error.message.split("\n")[0]}` };
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { lane, paths, reason } = chooseLane(process.argv[2]);
  if (reason) console.log(`::warning::${reason}; running the full pipeline`);
  if (paths) console.log(`Changed files:\n${paths.join("\n")}`);
  console.log(`CI lane: ${lane}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `lane=${lane}\n`);
}
