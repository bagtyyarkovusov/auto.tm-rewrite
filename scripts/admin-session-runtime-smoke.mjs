/** Run after `pnpm --filter @auto-tm/admin build`. Local loopback only; no deployment. */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const entry = resolve(root, "apps/admin/.next/standalone/apps/admin/server.js");
const manifest = JSON.parse(await readFile(resolve(root, "apps/admin/.next/server/server-reference-manifest.json"), "utf8"));
const actionId = Object.entries(manifest.node).find(([, value]) => value.exportedName === "dismissReport")?.[0];
assert(actionId, "built dismissReport Server Action must exist");
const jwt = (exp) => `e30.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.test-signature`;
const expired = jwt(1);
const sessions = new Map();
let rotations = 0;
let mutations = 0;
const bearerCalls = [];
function session() {
  const old = randomBytes(32).toString("hex");
  const pair = { accessToken: jwt(Math.floor(Date.now() / 1000) + 900), refreshToken: randomBytes(32).toString("hex") };
  sessions.set(old, { pair, used: false });
  return { old, pair };
}
const api = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  let body = "";
  for await (const chunk of req) body += chunk;
  if (req.url === "/api/v1/auth/refresh" && req.method === "POST") {
    const record = sessions.get(JSON.parse(body).refreshToken);
    rotations++;
    await delay(75); // Force overlapping GET/POST requests to share an owner.
    if (!record || record.used) { res.writeHead(401); res.end(JSON.stringify({ code: "TOKEN_ALREADY_USED" })); return; }
    record.used = true;
    res.end(JSON.stringify(record.pair));
    return;
  }
  bearerCalls.push(req.headers.authorization);
  const authorized = [...sessions.values()].some(({ pair, used }) => used && req.headers.authorization === `Bearer ${pair.accessToken}`);
  if (!authorized) { res.writeHead(401); res.end(JSON.stringify({ code: "UNAUTHORIZED" })); return; }
  if (req.url === "/api/v1/auth/admin/totp/status") {
    res.end(JSON.stringify({ enrolled: true, elevated: true }));
  } else if (req.url === "/api/v1/admin/reports/r1/dismiss" && req.method === "POST") {
    assert(JSON.parse(body).reason === "Runtime renewal proof", "original action arguments must reach mutation");
    mutations++;
    res.end(JSON.stringify({ reportId: "r1", status: "dismissed", reviewedAt: new Date().toISOString(), auditLogId: "runtime-proof" }));
  } else if (req.url?.startsWith("/api/v1/admin/reports?")) {
    res.end(JSON.stringify({ items: [], total: 0, page: 1, pageSize: 50, totalPages: 0 }));
  } else {
    res.writeHead(404); res.end(JSON.stringify({ code: "NOT_FOUND" }));
  }
});
await new Promise((resolve) => api.listen(0, "127.0.0.1", resolve));
const apiUrl = `http://127.0.0.1:${api.address().port}`;
async function port() {
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const value = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  return value;
}
function start(listenPort, address) {
  const env = { ...process.env, NODE_ENV: "production", HOSTNAME: "127.0.0.1", PORT: String(listenPort) };
  delete env.NEXT_PHASE;
  delete env.API_BASE_URL;
  delete env.ADMIN_ORIGIN;
  if (address !== undefined) env.API_BASE_URL = address;
  const child = spawn(process.execPath, [entry], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  let logs = "";
  child.stdout.on("data", (chunk) => { logs += chunk; });
  child.stderr.on("data", (chunk) => { logs += chunk; });
  return { child, logs: () => logs };
}
async function stop(child) {
  if (child.exitCode !== null) return;
  const closed = new Promise((resolve) => child.once("exit", resolve));
  child.kill("SIGTERM");
  await closed;
}
const listenPort = await port();
const origin = `http://127.0.0.1:${listenPort}`;
const running = start(listenPort, apiUrl);
const cookie = (old) => `__Host-auto_tm_admin_access=${expired}; __Host-auto_tm_admin_refresh=${old}`;
const request = (old, action = false) => fetch(`${origin}${action ? "/reports/r1" : "/reports"}`, {
  method: action ? "POST" : "GET", redirect: "manual",
  headers: { cookie: cookie(old), ...(action ? { origin, "Next-Action": actionId, "Content-Type": "text/plain" } : {}) },
  ...(action ? { body: JSON.stringify(["r1", "Runtime renewal proof"]) } : {}),
});
function rotatedCookies(response, pair) {
  const cookies = response.headers.getSetCookie();
  for (const [name, value] of [["access", pair.accessToken], ["refresh", pair.refreshToken]]) {
    assert(cookies.some((cookie) => cookie.startsWith(`__Host-auto_tm_admin_${name}=${value};`) && /HttpOnly/i.test(cookie) && /Secure/i.test(cookie)), `rotated ${name} must persist as restricted browser cookie`);
  }
}
try {
  let healthy = false;
  for (let i = 0; i < 100; i++) {
    if (running.child.exitCode !== null) throw new Error("standalone exited before health readiness");
    try { healthy = (await fetch(`${origin}/healthz`)).ok; } catch { /* starting */ }
    if (healthy) break;
    await delay(100);
  }
  assert(healthy, "standalone must become healthy");
  const first = session();
  const get = await request(first.old);
  assert.equal(get.status, 200, "expired GET must renew and render");
  rotatedCookies(get, first.pair);
  assert.equal(rotations, 1);
  assert(bearerCalls.length > 0 && bearerCalls.every((value) => value === `Bearer ${first.pair.accessToken}`), "GET rendering must read forwarded rotated access");
  console.log("PASS expired GET: cookies persisted; rendering uses renewed bearer");

  const concurrent = session();
  bearerCalls.length = 0;
  const before = rotations;
  const [parallelGet, action] = await Promise.all([request(concurrent.old), request(concurrent.old, true)]);
  assert.equal(parallelGet.status, 200);
  assert.equal(action.status, 200, "expired Server Action must dispatch after renewal");
  assert((await action.text()).includes("runtime-proof"), "actual action result must reach Flight response");
  rotatedCookies(parallelGet, concurrent.pair);
  rotatedCookies(action, concurrent.pair);
  assert.equal(rotations, before + 1, "overlapping GET/POST must rotate exactly once");
  assert.equal(mutations, 1, "original action must execute exactly once");
  assert(bearerCalls.every((value) => value === `Bearer ${concurrent.pair.accessToken}`), "action and rendering must use renewed bearer");
  console.log("PASS concurrent GET/Server Action: one rotation; original mutation runs once");

  const handoff = await request(concurrent.old);
  assert.equal(handoff.status, 200);
  assert.equal(rotations, before + 1, "short handoff must not spend refresh again");
  await delay(5_100);
  const loser = await request(concurrent.old, true);
  assert.equal(loser.status, 303);
  assert.equal(mutations, 1, "losing action must never execute or replay");
  assert(loser.headers.get("location")?.includes("/login?reason=session-expired"), "loser must reach expired-session login");
  assert(loser.headers.getSetCookie().filter((value) => /Max-Age=0/i.test(value)).length === 2, "loser must clear both cookies");
  const login = await fetch(new URL(loser.headers.get("location"), origin), { redirect: "manual" });
  assert.equal(login.status, 200, "login must not redirect-loop");
  assert((await login.text()).includes("Сессия истекла. Войдите снова."), "login must render Russian expired-session message");
  console.log("PASS cache expiry/loser: 303, both cookies cleared, no mutation, rendered login without loop");

  await stop(running.child);
  const restarted = start(listenPort, apiUrl);
  try {
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch(`${origin}/healthz`)).ok) break; } catch { /* starting */ }
      await delay(100);
    }
    const restartLoser = await request(first.old, true);
    assert.equal(restartLoser.status, 303, "lost process-local handoff must fail closed after restart");
    assert.equal(mutations, 1);
    console.log("PASS restart loser: login; original action never runs");
  } finally { await stop(restarted.child); }

  for (const invalid of [undefined, "ftp://api.example.test", "not-a-url"]) {
    const bad = start(await port(), invalid);
    try {
      for (let i = 0; i < 100 && bad.child.exitCode === null; i++) await delay(50);
      assert.equal(bad.child.exitCode, 1, "invalid production API address must exit with status 1");
      assert(bad.logs().includes("API_BASE_URL"), "startup error must name API_BASE_URL");
    } finally { await stop(bad.child); }
  }
  console.log("PASS production startup: missing/non-http/invalid API_BASE_URL exits 1");
} finally {
  await stop(running.child);
  await new Promise((resolve) => api.close(resolve));
}
