// Local network-layer mock for issue #518 simulator evidence. Not committed.
import http from "node:http";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const MODE_FILE = "/tmp/e518/mode";
const mode = () => (existsSync(MODE_FILE) ? readFileSync(MODE_FILE, "utf8").trim() : "fail");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const SCHEDULED = "2026-10-26T09:00:00.000Z";

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(body === undefined ? "" : JSON.stringify(body));
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const path = url.pathname.replace(/^\/api\/v1/, "");
    console.log(new Date().toISOString(), req.method, path, "mode=" + mode(), req.headers.authorization ?? "");
    if (path === "/__mode") {
      writeFileSync(MODE_FILE, url.searchParams.get("m") ?? "fail");
      return send(res, 200, { mode: mode() });
    }
    if (req.method === "POST" && path === "/auth/otp/request") {
      return send(res, 200, {
        requestId: "22222222-2222-4222-8222-222222222222",
        resendInSeconds: 30,
      });
    }
    if (req.method === "POST" && path === "/auth/otp/verify") {
      return send(res, 200, {
        accessToken: "pending-access",
        refreshToken: "pending-refresh",
        user: {
          id: USER_ID,
          phone: "+99360000000",
          email: null,
          displayName: null,
          role: "buyer",
          deletionScheduledAt: SCHEDULED,
        },
      });
    }
    if (req.method === "POST" && path === "/me/restore") {
      const m = mode();
      if (m === "expired")
        return send(res, 401, { code: "UNAUTHORIZED", message: "Unauthorized" });
      if (m === "fail")
        return send(res, 500, { code: "INTERNAL", message: "boom" });
      return send(res, 200, {
        id: USER_ID,
        phone: "+99360000000",
        email: null,
        phoneVerified: true,
        displayName: null,
        role: "buyer",
        avatarUrl: null,
        locale: "en",
        createdAt: "2026-01-01T00:00:00.000Z",
        deletionScheduledAt: null,
      });
    }
    if (req.method === "POST" && path === "/auth/logout") return send(res, 204);
    return send(res, 404, { code: "NOT_FOUND", message: "mock: " + path });
  })
  .listen(3099, () => console.log("mock listening on 3099"));
