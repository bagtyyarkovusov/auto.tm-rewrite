import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// A TestingModule whose graph registers a BullMQ queue but has no root
// connection dials 127.0.0.1:6379 instead of REDIS_URL (see
// test/helpers/bullTestRoot.ts). This reads the module graph from source and
// requires every such TestingModule to import bullTestRoot().

const apiRoot = join(__dirname, "..");
const srcRoot = join(apiRoot, "src");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

function importedModules(source: string): string[] {
  const imports = /imports:\s*\[([\s\S]*?)\]/.exec(source)?.[1] ?? "";
  return imports.match(/\b[A-Z]\w*Module\b/g) ?? [];
}

function queueModules(): Set<string> {
  const graph = new Map<string, { imports: string[]; registersQueue: boolean }>();
  for (const file of walk(srcRoot).filter((f) => f.endsWith(".module.ts"))) {
    const source = readFileSync(file, "utf8");
    const name = /export class (\w+Module)\b/.exec(source)?.[1];
    if (!name || name === "AppModule") continue;
    graph.set(name, {
      imports: importedModules(source),
      registersQueue: source.includes("BullModule.registerQueue"),
    });
  }
  const reaches = (name: string, seen = new Set<string>()): boolean => {
    const node = graph.get(name);
    if (!node || seen.has(name)) return false;
    seen.add(name);
    return node.registersQueue || node.imports.some((dep) => reaches(dep, seen));
  };
  return new Set([...graph.keys()].filter((name) => reaches(name)));
}

describe("bullTestRoot guard", () => {
  const modules = queueModules();

  it("finds the feature modules that register BullMQ queues", () => {
    expect(modules).toContain("IdentityModule");
    expect(modules).toContain("NotificationsModule");
  });

  it("gives every TestingModule that reaches a queue a REDIS_URL root", () => {
    const missing = walk(srcRoot)
      .filter((file) => file.endsWith(".spec.ts"))
      .flatMap((file) => {
        const source = readFileSync(file, "utf8");
        const testingModules = source.split("createTestingModule(").slice(1);
        return testingModules
          .filter((block) => importedModules(block).some((m) => modules.has(m)))
          .filter((block) => !/imports:\s*\[[^\]]*bullTestRoot\(\)/.test(block))
          .map(() => relative(apiRoot, file));
      });
    expect(missing).toEqual([]);
  });
});
