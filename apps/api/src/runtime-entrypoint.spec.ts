import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("API runtime entrypoint", () => {
  it("starts the path emitted by the Nest compiler and used by the API image", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(__dirname, "../package.json"), "utf8"),
    ) as { scripts?: { start?: string } };

    expect(packageJson.scripts?.start).toBe("node dist/src/main.js");
  });
});
