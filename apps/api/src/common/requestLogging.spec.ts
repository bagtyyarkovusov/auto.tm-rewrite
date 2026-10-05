import { createServer, request as httpRequest, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Writable } from "node:stream";

import pinoHttp from "pino-http";
import { afterEach, describe, expect, it } from "vitest";

import { requestLoggingOptions } from "./requestLogging";

const TOKEN = "eyJhbGciOiJIUzI1NiJ9.secret-access-token";

describe("API request logging", () => {
  let server: Server | undefined;

  afterEach(async () => {
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
  });

  async function logOneRequest(headers: Record<string, string>): Promise<string> {
    const lines: string[] = [];
    const out = new Writable({
      write(chunk, _encoding, done) {
        lines.push(String(chunk));
        done();
      },
    });
    const logger = pinoHttp(requestLoggingOptions("info"), out);
    server = createServer((req, res) => {
      logger(req, res);
      res.setHeader("set-cookie", "refresh=secret-refresh-cookie");
      res.end("ok");
    });
    await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    await new Promise<void>((resolve, reject) => {
      const req = httpRequest({ host: "127.0.0.1", port, path: "/api/v1/me", headers }, (res) => {
        res.resume();
        res.on("end", resolve);
      });
      req.on("error", reject);
      req.end();
    });
    return lines.join("");
  }

  it("never writes a bearer token, a cookie or a set-cookie to the log", async () => {
    const log = await logOneRequest({
      authorization: `Bearer ${TOKEN}`,
      cookie: "session=secret-cookie",
    });

    expect(log).toContain("/api/v1/me");
    expect(log).toContain("[Redacted]");
    expect(log).not.toContain("secret-access-token");
    expect(log).not.toContain("secret-cookie");
    expect(log).not.toContain("secret-refresh-cookie");
  });
});
