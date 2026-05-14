import "reflect-metadata";

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import supertest from "supertest";
import { PrismaService } from "@auto-tm/db";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";

import { IdentityModule } from "../identity.module";
import { JwtAuthGuard } from "../../../common/jwt-auth.guard";
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

describe("AuthController e2e — POST /api/v1/auth/otp/verify", () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof supertest>;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env["OTP_TEST_MODE"] = "true";
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
    delete process.env["OTP_TEST_MODE"];
    await app.close();
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.otpRequest.deleteMany();
  });

  async function requestOtp(phone: string): Promise<string> {
    const res = await request
      .post("/api/v1/auth/otp/request")
      .send({ phone })
      .expect(201);
    return res.body.testCode as string;
  }

  it("verifies a valid OTP and returns tokens + user", async () => {
    const testCode = await requestOtp("+99361234567");

    const res = await request
      .post("/api/v1/auth/otp/verify")
      .send({ phone: "+99361234567", code: testCode, deviceLabel: "Chrome on Mac" })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(res.body.accessToken).toMatch(/^eyJ/);
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.refreshToken).toMatch(/^[a-f0-9]{64}$/);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.phone).toBe("+99361234567");
    expect(res.body.user.role).toBe("buyer");
  });

  it("returns 400 OTP_NOT_FOUND when no OTP was requested", async () => {
    const res = await request
      .post("/api/v1/auth/otp/verify")
      .send({ phone: "+99361234567", code: "123456" })
      .expect(400);

    expect(res.body.code).toBe("OTP_NOT_FOUND");
  });

  it("returns 400 INVALID_OTP for wrong code", async () => {
    await requestOtp("+99361234567");

    const res = await request
      .post("/api/v1/auth/otp/verify")
      .send({ phone: "+99361234567", code: "000000" })
      .expect(400);

    expect(res.body.code).toBe("INVALID_OTP");
  });

  it("returns 400 OTP_ALREADY_USED when code is reused", async () => {
    const testCode = await requestOtp("+99361234567");

    await request
      .post("/api/v1/auth/otp/verify")
      .send({ phone: "+99361234567", code: testCode })
      .expect(201);

    const res = await request
      .post("/api/v1/auth/otp/verify")
      .send({ phone: "+99361234567", code: testCode })
      .expect(400);

    expect(res.body.code).toBe("OTP_ALREADY_USED");
  });

  it("creates a new user on first verification and reuses on second", async () => {
    const testCode1 = await requestOtp("+99361234567");
    const res1 = await request
      .post("/api/v1/auth/otp/verify")
      .send({ phone: "+99361234567", code: testCode1 })
      .expect(201);

    const userId = res1.body.user.id;

    // Request a new OTP and verify again with same phone
    const testCode2 = await requestOtp("+99361234567");
    const res2 = await request
      .post("/api/v1/auth/otp/verify")
      .send({ phone: "+99361234567", code: testCode2 })
      .expect(201);

    expect(res2.body.user.id).toBe(userId);
  });
});

describe("AuthController e2e — POST /api/v1/auth/logout", () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof supertest>;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env["OTP_TEST_MODE"] = "true";
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
    delete process.env["OTP_TEST_MODE"];
    await app.close();
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.otpRequest.deleteMany();
  });

  async function login(phone: string): Promise<{ accessToken: string; refreshToken: string }> {
    const otpRes = await request
      .post("/api/v1/auth/otp/request")
      .send({ phone })
      .expect(201);
    const verifyRes = await request
      .post("/api/v1/auth/otp/verify")
      .send({ phone, code: otpRes.body.testCode })
      .expect(201);
    return {
      accessToken: verifyRes.body.accessToken,
      refreshToken: verifyRes.body.refreshToken,
    };
  }

  it("returns 204 and deletes the session matching the supplied refresh token", async () => {
    const { refreshToken } = await login("+99361234567");

    await request
      .post("/api/v1/auth/logout")
      .send({ refreshToken })
      .expect(204);

    // Verify the session is gone — refreshing with the same token should fail
    await request
      .post("/api/v1/auth/refresh")
      .send({ refreshToken })
      .expect(401);
  });

  it("returns 401 for an unknown refresh token", async () => {
    const res = await request
      .post("/api/v1/auth/logout")
      .send({ refreshToken: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789" })
      .expect(401);

    expect(res.body.code).toBe("INVALID_REFRESH_TOKEN");
  });

  it("returns 400 for missing body", async () => {
    const res = await request
      .post("/api/v1/auth/logout")
      .send({})
      .expect(400);

    expect(res.body.code).toBe("VALIDATION_FAILED");
  });

  it("is idempotent — second call with same token returns 401", async () => {
    const { refreshToken } = await login("+99361234567");

    // First logout succeeds
    await request
      .post("/api/v1/auth/logout")
      .send({ refreshToken })
      .expect(204);

    // Second logout with same (now-deleted) token
    const res = await request
      .post("/api/v1/auth/logout")
      .send({ refreshToken })
      .expect(401);

    expect(res.body.code).toBe("INVALID_REFRESH_TOKEN");
  });
});

describe("AuthController e2e — POST /api/v1/auth/logout-all", () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof supertest>;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env["OTP_TEST_MODE"] = "true";
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [IdentityModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    const reflector = app.get(Reflector);
    const jwtService = app.get(JwtService);
    app.useGlobalGuards(new JwtAuthGuard(reflector, jwtService));
    app.useGlobalFilters(new GlobalErrorFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    request = supertest(app.getHttpServer());
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    delete process.env["OTP_TEST_MODE"];
    await app.close();
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.otpRequest.deleteMany();
  });

  async function login(phone: string): Promise<{ accessToken: string; refreshToken: string }> {
    const otpRes = await request
      .post("/api/v1/auth/otp/request")
      .send({ phone })
      .expect(201);
    const verifyRes = await request
      .post("/api/v1/auth/otp/verify")
      .send({ phone, code: otpRes.body.testCode })
      .expect(201);
    return {
      accessToken: verifyRes.body.accessToken,
      refreshToken: verifyRes.body.refreshToken,
    };
  }

  it("returns 401 when no bearer token is provided", async () => {
    await request
      .post("/api/v1/auth/logout-all")
      .expect(401);
  });

  it("returns 204 and deletes all sessions for the authenticated user", async () => {
    const { accessToken, refreshToken } = await login("+99361234567");

    await request
      .post("/api/v1/auth/logout-all")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204);

    // Verify all sessions are gone — refresh should fail
    await request
      .post("/api/v1/auth/refresh")
      .send({ refreshToken })
      .expect(401);
  });

  it("only deletes the authenticated user's sessions, not others", async () => {
    const { accessToken, refreshToken: user1Refresh } = await login("+99361234567");
    const { refreshToken: user2Refresh } = await login("+99363334444");

    // User 1 logs out all
    await request
      .post("/api/v1/auth/logout-all")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204);

    // User 1's sessions gone — refresh fails
    await request
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: user1Refresh })
      .expect(401);

    // User 2's session still works
    await request
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: user2Refresh })
      .expect(201);
  });
});

describe("MeController e2e — GET /api/v1/me", () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof supertest>;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env["OTP_TEST_MODE"] = "true";
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [IdentityModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    const reflector = app.get(Reflector);
    const jwtService = app.get(JwtService);
    app.useGlobalGuards(new JwtAuthGuard(reflector, jwtService));
    app.useGlobalFilters(new GlobalErrorFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    request = supertest(app.getHttpServer());
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    delete process.env["OTP_TEST_MODE"];
    await app.close();
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.otpRequest.deleteMany();
  });

  async function login(phone: string): Promise<{ accessToken: string; userId: string }> {
    const otpRes = await request
      .post("/api/v1/auth/otp/request")
      .send({ phone })
      .expect(201);
    const verifyRes = await request
      .post("/api/v1/auth/otp/verify")
      .send({ phone, code: otpRes.body.testCode })
      .expect(201);
    return {
      accessToken: verifyRes.body.accessToken,
      userId: verifyRes.body.user.id,
    };
  }

  it("returns 401 when no bearer token is provided", async () => {
    await request
      .get("/api/v1/me")
      .expect(401);
  });

  it("returns the user shape for an authenticated request", async () => {
    const { accessToken, userId } = await login("+99361234567");

    const res = await request
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.id).toBe(userId);
    expect(res.body.phone).toBe("+99361234567");
    expect(res.body.role).toBe("buyer");
    expect(res.body).toHaveProperty("displayName");
    expect(res.body).toHaveProperty("avatarUrl");
    expect(res.body).toHaveProperty("locale");
    expect(res.body).toHaveProperty("createdAt");
  });

  it("returns the correct role for the authenticated user", async () => {
    // Login as buyer
    const { accessToken } = await login("+99361234567");

    const res = await request
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.role).toBe("buyer");
  });
});

describe("MeController e2e — DELETE /api/v1/me", () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof supertest>;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env["OTP_TEST_MODE"] = "true";
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [IdentityModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    const reflector = app.get(Reflector);
    const jwtService = app.get(JwtService);
    app.useGlobalGuards(new JwtAuthGuard(reflector, jwtService));
    app.useGlobalFilters(new GlobalErrorFilter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    request = supertest(app.getHttpServer());
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    delete process.env["OTP_TEST_MODE"];
    await app.close();
  });

  beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.otpRequest.deleteMany();
  });

  async function login(phone: string): Promise<{ accessToken: string; userId: string }> {
    const otpRes = await request
      .post("/api/v1/auth/otp/request")
      .send({ phone })
      .expect(201);
    const verifyRes = await request
      .post("/api/v1/auth/otp/verify")
      .send({ phone, code: otpRes.body.testCode })
      .expect(201);
    return {
      accessToken: verifyRes.body.accessToken,
      userId: verifyRes.body.user.id,
    };
  }

  it("returns 401 when no bearer token is provided", async () => {
    await request
      .delete("/api/v1/me")
      .expect(401);
  });

  it("returns 401 with an invalid bearer token", async () => {
    await request
      .delete("/api/v1/me")
      .set("Authorization", "Bearer invalid-token")
      .expect(401);
  });

  it("returns 204 and deletes the authenticated user", async () => {
    const { accessToken, userId } = await login("+99361234567");

    await request
      .delete("/api/v1/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204);

    // Verify user is gone
    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user).toBeNull();
  });

  it("returns 204 and deletes user sessions via cascade", async () => {
    const { accessToken, userId } = await login("+99361234567");

    // Verify session exists before deletion
    const sessionsBefore = await prisma.session.count({ where: { userId } });
    expect(sessionsBefore).toBeGreaterThan(0);

    await request
      .delete("/api/v1/me")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(204);

    // Sessions are cascade-deleted with the user
    const sessionsAfter = await prisma.session.count({ where: { userId } });
    expect(sessionsAfter).toBe(0);
  });
});
