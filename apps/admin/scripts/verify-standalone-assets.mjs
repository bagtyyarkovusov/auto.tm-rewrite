import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { cp, mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Exercise the runtime image's actual COPY layout, without building Docker.
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const layout = await mkdtemp(path.join(tmpdir(), "issue-739-admin-layout-"));
const dockerfile = await readFile(path.join(repo, "infra/docker/admin.Dockerfile"), "utf8");
const runtime = dockerfile.split("FROM base AS runtime")[1];
assert.ok(runtime, "Admin runtime stage missing");
for (const copy of runtime.matchAll(/^COPY --from=build (\/app\/\S+) (\/app\S*)$/gm)) {
  const source = path.join(repo, copy[1].slice("/app/".length));
  const destination = path.join(layout, copy[2].slice("/app".length));
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true });
}
const port = 17492;
const server = spawn(process.execPath, [path.join(layout, "apps/admin/server.js")], {
  cwd: layout,
  env: { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1" },
  stdio: "ignore",
});
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      const health = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (health.ok) { ready = true; break; }
    } catch { /* server still starting */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, "Standalone server did not start");
  const avatar = await fetch(`http://127.0.0.1:${port}/assigned-avatars/3.svg`);
  assert.equal(avatar.status, 200, "Assigned Avatar must be served by the Dockerfile runtime layout");
  assert.match(avatar.headers.get("content-type") ?? "", /image\/svg\+xml/);
  assert.match(await avatar.text(), /<svg/);
  console.log(`PASS standalone Dockerfile layout: Assigned Avatar HTTP 200; layout=${layout}`);
} finally {
  const stopped = once(server, "exit");
  server.kill("SIGTERM");
  await stopped;
}
