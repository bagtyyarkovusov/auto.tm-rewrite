import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

// supertest connects to 127.0.0.1. A server that supertest starts itself
// listens on every address (`::`), and on macOS another process can later
// bind 127.0.0.1 on the same port and receive the request instead. That
// produced unexplained 200, 401, and 404 responses and `socket hang up` in
// CI (#442). A server listening on 127.0.0.1 keeps its port for the suite.
describe("API e2e suites", () => {
  const src = resolve(__dirname);
  const suites = readdirSync(src, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".e2e.spec.ts"))
    .filter((path) => readFileSync(join(src, path), "utf8").includes("supertest("));

  it("finds the supertest suites", () => {
    expect(suites.length).toBeGreaterThan(0);
  });

  it.each(suites)("%s listens on 127.0.0.1 before sending requests", (path) => {
    const source = readFileSync(join(src, path), "utf8");

    expect(source).toContain('app.listen(0, "127.0.0.1")');
    expect(source).not.toContain("app.init()");
  });
});
