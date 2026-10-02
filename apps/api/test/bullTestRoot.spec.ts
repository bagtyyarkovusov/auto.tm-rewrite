import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// A TestingModule whose graph registers a BullMQ queue but has no root
// connection dials 127.0.0.1:6379 instead of REDIS_URL (see
// test/helpers/bullTestRoot.ts). This reads the module graph from source and
// requires every such TestingModule to import bullTestRoot().

const apiRoot = join(__dirname, "..");
const scanRoots = [join(apiRoot, "src"), join(apiRoot, "test")];
// Any BullModule registration that creates a queue-backed connection.
const QUEUE_REGISTRATION = /BullModule\.register(Queue|QueueAsync|FlowProducer|FlowProducerAsync)\b/;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

const files = scanRoots.flatMap(walk);

/** Body of the first `imports: [...]` list, bracket-balanced. */
function importsList(source: string): string {
  const start = /imports:\s*\[/.exec(source);
  if (!start) return "";
  let depth = 1;
  const from = start.index + start[0].length;
  for (let i = from; i < source.length; i += 1) {
    if (source[i] === "[") depth += 1;
    else if (source[i] === "]" && (depth -= 1) === 0) return source.slice(from, i);
  }
  return source.slice(from);
}

function importedModules(source: string): string[] {
  return importsList(source).match(/\b[A-Z]\w*Module\b/g) ?? [];
}

function queueModules(): Set<string> {
  const graph = new Map<string, { imports: string[]; registersQueue: boolean }>();
  for (const file of files.filter((f) => f.endsWith(".module.ts"))) {
    const source = readFileSync(file, "utf8");
    const name = /export class (\w+Module)\b/.exec(source)?.[1];
    if (!name || name === "AppModule") continue;
    graph.set(name, {
      imports: importedModules(source),
      registersQueue: QUEUE_REGISTRATION.test(source),
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

  it("reads a whole imports list past nested array arguments", () => {
    const block = "{ imports: [ThrottlerModule.forRoot([{ ttl: 1 }]), IdentityModule, bullTestRoot()] }";
    expect(importedModules(block)).toEqual(["ThrottlerModule", "IdentityModule"]);
    expect(importsList(block)).toContain("bullTestRoot()");
  });

  it("gives every TestingModule that reaches a queue a REDIS_URL root", () => {
    const missing = files
      .filter((file) => file.endsWith(".spec.ts") && file !== __filename)
      .flatMap((file) => {
        const source = readFileSync(file, "utf8");
        const testingModules = source.split("createTestingModule(").slice(1);
        return testingModules
          .filter((block) => importedModules(block).some((m) => modules.has(m)))
          .filter((block) => !importsList(block).includes("bullTestRoot()"))
          .map(() => relative(apiRoot, file));
      });
    expect(missing).toEqual([]);
  });
});
