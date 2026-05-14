import "reflect-metadata";

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import supertest from "supertest";
import { PrismaService } from "@auto-tm/db";

import { IdentityModule } from "../identity.module";
import { GlobalErrorFilter } from "../../../common/error.filter";

describe("AuthController e2e — POST /api/v1/auth/otp/request", () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof supertest>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [IdentityModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalFilters(new GlobalErrorFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    request = supertest(app.getHttpServer());
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.otpRequest.deleteMany();
  });

  it("returns 201 with requestId and resendInSeconds for a valid TM phone", async () => {
    const res = await request
      .post("/api/v1/auth/otp/request")
      .send({ phone: "+99361234567" })
      .expect(201);

    expect(res.body.requestId).toBeDefined();
    expect(res.body.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    // resendInSeconds should be 60 for first request (60 * 2^0)
    // Allow small clock skew (±5s)
    expect(res.body.resendInSeconds).toBeGreaterThanOrEqual(55);
    expect(res.body.resendInSeconds).toBeLessThanOrEqual(60);
    expect(res.body.testCode).toBeUndefined();
  });

  it("returns 400 VALIDATION_FAILED for an invalid phone number", async () => {
    const res = await request
      .post("/api/v1/auth/otp/request")
      .send({ phone: "+15551234567" })
      .expect(400);

    expect(res.body.code).toBe("VALIDATION_FAILED");
  });

  it("returns 400 VALIDATION_FAILED for a malformed phone", async () => {
    const res = await request
      .post("/api/v1/auth/otp/request")
      .send({ phone: "not-a-phone" })
      .expect(400);

    expect(res.body.code).toBe("VALIDATION_FAILED");
  });

  it("returns 400 VALIDATION_FAILED for missing body", async () => {
    const res = await request
      .post("/api/v1/auth/otp/request")
      .send({})
      .expect(400);

    expect(res.body.code).toBe("VALIDATION_FAILED");
  });

  it("enforces phone daily rate limit (5 requests)", async () => {
    const phone = "+99363334444";
    for (let i = 0; i < 5; i++) {
      await request
        .post("/api/v1/auth/otp/request")
        .send({ phone })
        .expect(201);
    }

    const res = await request
      .post("/api/v1/auth/otp/request")
      .send({ phone })
      .expect(400);

    expect(res.body.code).toBe("RATE_LIMITED");
  });
});
