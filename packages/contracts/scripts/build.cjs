const { spawnSync } = require("node:child_process");
const { mkdirSync, rmSync, statSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const packageDir = join(__dirname, "..");
const distDir = join(packageDir, "dist");
const lockDir = join(packageDir, ".build.lock");
const staleLockMs = 120_000;
let hasLock = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function acquireLock() {
  for (;;) {
    try {
      mkdirSync(lockDir);
      hasLock = true;
      return;
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }

      try {
        const ageMs = Date.now() - statSync(lockDir).mtimeMs;
        if (ageMs > staleLockMs) {
          rmSync(lockDir, { recursive: true, force: true });
          continue;
        }
      } catch {
        rmSync(lockDir, { recursive: true, force: true });
        continue;
      }

      await sleep(100);
    }
  }
}

function releaseLock() {
  if (hasLock) {
    rmSync(lockDir, { recursive: true, force: true });
    hasLock = false;
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: packageDir,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function main() {
  await acquireLock();
  try {
    mkdirSync(distDir, { recursive: true });
    writeFileSync(join(distDir, "package.json"), '{"type":"commonjs"}\n');
    run("pnpm", ["exec", "tsc", "-p", "tsconfig.build.json"]);
  } finally {
    releaseLock();
  }
}

process.on("exit", releaseLock);
process.on("SIGINT", () => {
  releaseLock();
  process.exit(130);
});
process.on("SIGTERM", () => {
  releaseLock();
  process.exit(143);
});

main().catch((error) => {
  releaseLock();
  console.error(error);
  process.exit(1);
});
