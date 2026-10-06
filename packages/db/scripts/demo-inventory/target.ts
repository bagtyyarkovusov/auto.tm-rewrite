/**
 * Loads `.env`, parses `--mode`, and decides where the demo inventory script may write.
 *
 * `demo-inventory.ts` imports this before any other module, so an unsafe target is refused before
 * the generated Prisma client, sharp or an S3 client is loaded, and nothing can connect before the
 * guard has run.
 */
import "dotenv/config";

import { assertDemoInventoryTarget, type DemoInventoryMode } from "./guard";

function parseMode(argv: readonly string[]): DemoInventoryMode {
  const at = argv.indexOf("--mode");
  const value = at === -1 ? undefined : argv[at + 1];
  if (value !== "seed" && value !== "remove") {
    throw new Error("Usage: demo-inventory.ts --mode seed|remove");
  }
  return value;
}

function decide() {
  try {
    const mode = parseMode(process.argv);
    return { mode, target: assertDemoInventoryTarget(process.env, mode) };
  } catch (error) {
    // Guard messages never contain a value; print nothing but the message.
    console.error(error instanceof Error ? error.message : "Demo inventory refused");
    process.exit(1);
  }
}

export const { mode: MODE, target: TARGET } = decide();
