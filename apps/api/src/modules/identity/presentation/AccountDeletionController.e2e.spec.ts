import "reflect-metadata";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { Reflector } from "@nestjs/core";
import { JwtModule, JwtService } from "@nestjs/jwt";
import supertest from "supertest";
import { PrismaService } from "@auto-tm/db";

import { GlobalErrorFilter } from "../../../common/error.filter";
import { JwtAuthGuard } from "../../../common/jwt-auth.guard";
import {
  EMAIL_CODE_SENDER_PORT,
  type EmailCodeSenderPort,
} from "../domain/ports/EmailCodeSenderPort";
import { IdentityModule } from "../identity.module";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("AccountDeletionController e2e", () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof supertest>;
  let prisma: PrismaService;
  const queued: Array<Parameters<EmailCodeSenderPort["enqueue"]>[0]> = [];

  beforeAll(async () => {
    process.env["OTP_TEST_MODE"] = "true";
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        IdentityModule,
        JwtModule.register({
          global: true,
          secret: process.env["JWT_ACCESS_SECRET"] ?? "dev-secret-change-me",
          signOptions: { expiresIn: "1h" },
        }),
      ],
    })
      .overrideProvider(EMAIL_CODE_SENDER_PORT)
      .useValue({ enqueue: async (input: Parameters<EmailCodeSenderPort["enqueue"]>[0]) => {
        queued.push(input);
      } } satisfies EmailCodeSenderPort)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.useGlobalGuards(new JwtAuthGuard(app.get(Reflector), app.get(JwtService)));
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
    queued.length = 0;
    await prisma.session.deleteMany();
    await prisma.otpRequest.deleteMany();
    await prisma.user.deleteMany();
  });

  async function createSession(userId: string) {
    return prisma.session.create({
      data: {
        userId,
        refreshTokenHash: `session-${userId}`,
        expiresAt: new Date(Date.now() + DAY_MS),
      },
    });
  }

  it("starts the same 30-day grace period as DELETE /me without a bearer token", async () => {
    const user = await prisma.user.create({
      data: { phone: "+99361234567", phoneVerifiedAt: new Date() },
    });
    await createSession(user.id);

    const before = Date.now();
    const codeResponse = await request
      .post("/api/v1/account-deletion/request")
      .send({ phone: "+99361234567" })
      .expect(201);
    await request
      .post("/api/v1/account-deletion/confirm")
      .send({ phone: "+99361234567", code: codeResponse.body.testCode })
      .expect(204, "");

    const deleted = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(deleted.deletionScheduledAt).not.toBeNull();
    const graceMs = deleted.deletionScheduledAt!.getTime() - before;
    expect(graceMs).toBeGreaterThanOrEqual(30 * DAY_MS);
    expect(graceMs).toBeLessThan(30 * DAY_MS + 60_000);
    expect(deleted.phone).toBe("+99361234567");
    await expect(prisma.session.count({ where: { userId: user.id } })).resolves.toBe(0);
  });

  it("sends an account-deletion email and deletes the email holder", async () => {
    const user = await prisma.user.create({
      data: { email: "seller@example.com", emailVerifiedAt: new Date() },
    });

    const codeResponse = await request
      .post("/api/v1/account-deletion/request")
      .send({ email: " Seller@Example.COM " })
      .expect(201);
    await request
      .post("/api/v1/account-deletion/confirm")
      .send({ email: "seller@example.com", code: codeResponse.body.testCode })
      .expect(204);

    expect(queued).toEqual([
      expect.objectContaining({
        email: "seller@example.com",
        purpose: "account-deletion",
      }),
    ]);
    const deleted = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(deleted.deletionScheduledAt).not.toBeNull();
  });

  it("answers an unheld value the same way and changes no User", async () => {
    const bystander = await prisma.user.create({
      data: { phone: "+99365000000", phoneVerifiedAt: new Date() },
    });

    const codeResponse = await request
      .post("/api/v1/account-deletion/request")
      .send({ phone: "+99361234567" })
      .expect(201);
    expect(Object.keys(codeResponse.body).sort()).toEqual(
      ["requestId", "resendInSeconds", "testCode"],
    );
    await request
      .post("/api/v1/account-deletion/confirm")
      .send({ phone: "+99361234567", code: codeResponse.body.testCode })
      .expect(204, "");

    await expect(prisma.user.count()).resolves.toBe(1);
    const untouched = await prisma.user.findUniqueOrThrow({ where: { id: bystander.id } });
    expect(untouched.deletionScheduledAt).toBeNull();
  });

  it("rejects a wrong code with the sign-in error shape and changes nothing", async () => {
    const user = await prisma.user.create({
      data: { phone: "+99361234567", phoneVerifiedAt: new Date() },
    });
    await request
      .post("/api/v1/account-deletion/request")
      .send({ phone: "+99361234567" })
      .expect(201);

    const response = await request
      .post("/api/v1/account-deletion/confirm")
      .send({ phone: "+99361234567", code: "000000" })
      .expect(400);

    expect(response.body.code).toBe("INVALID_OTP");
    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(unchanged.deletionScheduledAt).toBeNull();
  });

  it("does not accept a sign-in code as a deletion code for a held value", async () => {
    const user = await prisma.user.create({
      data: { phone: "+99361234567", phoneVerifiedAt: new Date() },
    });
    const signIn = await request
      .post("/api/v1/auth/otp/request")
      .send({ phone: "+99361234567" })
      .expect(201);

    const response = await request
      .post("/api/v1/account-deletion/confirm")
      .send({ phone: "+99361234567", code: signIn.body.testCode })
      .expect(400);

    expect(response.body.code).toBe("OTP_NOT_FOUND");
    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(unchanged.deletionScheduledAt).toBeNull();
  });

  it("shares the destination cooldown with sign-in codes", async () => {
    await request
      .post("/api/v1/auth/otp/request")
      .send({ phone: "+99361234567" })
      .expect(201);

    const response = await request
      .post("/api/v1/account-deletion/request")
      .send({ phone: "+99361234567" })
      .expect(400);

    expect(response.body.code).toBe("RATE_LIMITED");
  });

  it("shares the per-IP budget with sign-in codes", async () => {
    for (let index = 0; index < 10; index += 1) {
      await request
        .post("/api/v1/auth/otp/request")
        .set("X-Forwarded-For", "203.0.113.7")
        .send({ phone: `+9936100000${index}` })
        .expect(201);
    }

    const response = await request
      .post("/api/v1/account-deletion/request")
      .set("X-Forwarded-For", "203.0.113.7")
      .send({ email: "seller@example.com" })
      .expect(400);

    expect(response.body.code).toBe("RATE_LIMITED");
    expect(queued).toHaveLength(0);
  });

  it("rejects a body carrying both a phone and an email", async () => {
    const response = await request
      .post("/api/v1/account-deletion/request")
      .send({ phone: "+99361234567", email: "seller@example.com" })
      .expect(400);

    expect(response.body.code).toBe("VALIDATION_FAILED");
  });
});
