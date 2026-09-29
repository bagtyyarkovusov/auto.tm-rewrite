import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

// supertest connects to 127.0.0.1. A server that supertest starts itself
// listens on every address (`::`), and on macOS another process, such as
// Docker publishing a container port, can later bind 127.0.0.1 on the same
// port and receive the request instead. That matches the unexplained 200,
// 401, and 404 responses and `socket hang up` in CI (#442). A server
// listening on 127.0.0.1 keeps its port for the suite.
const apiRoot = resolve(__dirname, "..");
const supertestImport =
  /import\s+(?:\*\s+as\s+)?(\w+)(?:\s*,\s*\{[^}]*\})?\s+from\s+["']supertest["']/;

function specFiles(dir: string): string[] {
  return readdirSync(join(apiRoot, dir), { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".spec.ts"))
    .map((path) => join(apiRoot, dir, path));
}

function count(source: string, text: string): number {
  return source.split(text).length - 1;
}

describe("API supertest suites", () => {
  const suites = [...specFiles("src"), ...specFiles("test")]
    .filter((path) => path !== __filename)
    .map((path) => ({
      path: relative(apiRoot, path),
      // Comments may mention the old start; only code counts.
      code: readFileSync(path, "utf8").replace(/^\s*\/\/.*$/gm, ""),
    }))
    .filter(({ code }) => supertestImport.test(code));

  it("finds the supertest suites", () => {
    expect(suites.length).toBeGreaterThan(0);
  });

  it.each(suites.map(({ path, code }) => [path, code]))(
    "%s starts every app on 127.0.0.1",
    (_path, code) => {
      const name = supertestImport.exec(code)?.[1] ?? "supertest";
      const servers = count(code, `${name}(`) + count(code, `${name}.agent(`);

      expect(count(code, 'app.listen(0, "127.0.0.1")')).toBe(servers);
      expect(code).not.toContain("app.init()");
      expect(code).not.toContain(".ready()");
    },
  );
});
