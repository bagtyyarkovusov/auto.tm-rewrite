import "reflect-metadata";

import { Writable } from "node:stream";

import { Controller, Get } from "@nestjs/common";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { LoggerModule } from "nestjs-pino";
import supertest from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { requestLoggingOptions } from "./requestLogging";

const TOKEN = "eyJhbGciOiJIUzI1NiJ9.secret-access-token";

@Controller("api/v1")
class ProbeController {
  @Get("listings")
  listings() {
    return { items: [] };
  }

  @Get("me")
  me() {
    return { ok: true };
  }
}

describe("API request logging", () => {
  let app: NestFastifyApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  /**
   * Logs one request through the stack the API runs: `LoggerModule` on Nest's
   * Fastify adapter, whose middleware layer hands pino the parsed query as
   * well as the URL.
   */
  async function logOneRequest(headers: Record<string, string>, path = "/api/v1/me"): Promise<string> {
    const lines: string[] = [];
    const out = new Writable({
      write(chunk, _encoding, done) {
        lines.push(String(chunk));
        done();
      },
    });

    const moduleRef = await Test.createTestingModule({
      imports: [LoggerModule.forRoot({ pinoHttp: [requestLoggingOptions("info"), out] })],
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    app.getHttpAdapter().getInstance().addHook("onSend", async (_req, reply) => {
      reply.header("set-cookie", "refresh=secret-refresh-cookie");
    });
    await app.listen(0, "127.0.0.1");

    await supertest(app.getHttpServer()).get(path).set(headers).expect(200);
    return lines.join("");
  }

  it("logs the path of a search without its query string or its parsed query", async () => {
    const log = await logOneRequest({}, "/api/v1/listings?q=toyota+camry+secret-search&limit=20");

    expect(log).toContain('"url":"/api/v1/listings"');
    expect(log).not.toContain("secret-search");
    expect(log).not.toContain("limit");
    expect(log).not.toContain('"query"');
  });

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
