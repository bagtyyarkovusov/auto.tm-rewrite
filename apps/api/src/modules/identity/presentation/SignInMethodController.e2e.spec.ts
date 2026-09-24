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
import {
  IDENTITY_ERROR_CODES,
  IdentityDomainError,
} from "../domain/types";
import { IdentityModule } from "../identity.module";
import { PrismaUserRepository } from "../infrastructure/PrismaUserRepository";

describe("MeController e2e - Sign-in Method changes", () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof supertest>;
  let prisma: PrismaService;
  let jwt: JwtService;
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
    jwt = app.get(JwtService);
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

  function bearer(userId: string): string {
    return `Bearer ${jwt.sign({ sub: userId, role: "buyer" })}`;
  }

  it("adds a phone to an email-only User without creating or revoking sessions", async () => {
    const user = await prisma.user.create({
      data: { email: "buyer@example.com", emailVerifiedAt: new Date() },
    });
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: "existing-session-hash",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    const authorization = bearer(user.id);

    const codeResponse = await request
      .post("/api/v1/me/sign-in-methods/request")
      .set("Authorization", authorization)
      .send({ phone: "+99361234567" })
      .expect(201);
    const result = await request
      .post("/api/v1/me/sign-in-methods/verify")
      .set("Authorization", authorization)
      .send({ phone: "+99361234567", code: codeResponse.body.testCode })
      .expect(201);

    expect(result.body).toMatchObject({
      id: user.id,
      phone: "+99361234567",
      email: "buyer@example.com",
      phoneVerified: true,
    });
    await expect(prisma.session.findUnique({ where: { id: session.id } })).resolves.toBeDefined();
  });

  it("adds an email to a phone-only User and sends Sign-in Method email copy", async () => {
    const user = await prisma.user.create({
      data: { phone: "+99361234567", phoneVerifiedAt: new Date() },
    });
    const authorization = bearer(user.id);

    const codeResponse = await request
      .post("/api/v1/me/sign-in-methods/request")
      .set("Authorization", authorization)
      .send({ email: " New@Example.COM " })
      .expect(201);
    const result = await request
      .post("/api/v1/me/sign-in-methods/verify")
      .set("Authorization", authorization)
      .send({ email: "new@example.com", code: codeResponse.body.testCode })
      .expect(201);

    expect(queued).toEqual([
      expect.objectContaining({
        email: "new@example.com",
        purpose: "sign-in-method",
      }),
    ]);
    expect(result.body).toMatchObject({
      phone: "+99361234567",
      email: "new@example.com",
    });
  });

  it("replaces either method and frees both old values immediately", async () => {
    const user = await prisma.user.create({
      data: {
        phone: "+99361234567",
        phoneVerifiedAt: new Date(),
        email: "old@example.com",
        emailVerifiedAt: new Date(),
      },
    });
    const authorization = bearer(user.id);

    const phoneRequest = await request
      .post("/api/v1/me/sign-in-methods/request")
      .set("Authorization", authorization)
      .send({ phone: "+99362234567" })
      .expect(201);
    await request
      .post("/api/v1/me/sign-in-methods/verify")
      .set("Authorization", authorization)
      .send({ phone: "+99362234567", code: phoneRequest.body.testCode })
      .expect(201);

    const emailRequest = await request
      .post("/api/v1/me/sign-in-methods/request")
      .set("Authorization", authorization)
      .send({ email: "new@example.com" })
      .expect(201);
    await request
      .post("/api/v1/me/sign-in-methods/verify")
      .set("Authorization", authorization)
      .send({ email: "new@example.com", code: emailRequest.body.testCode })
      .expect(201);

    await expect(prisma.user.create({
      data: {
        phone: "+99361234567",
        phoneVerifiedAt: new Date(),
        email: "old@example.com",
        emailVerifiedAt: new Date(),
      },
    })).resolves.toBeDefined();
  });

  it("returns SIGN_IN_METHOD_TAKEN only after a correct code and changes neither User", async () => {
    const current = await prisma.user.create({
      data: { phone: "+99361234567", phoneVerifiedAt: new Date() },
    });
    const owner = await prisma.user.create({
      data: {
        email: "taken@example.com",
        emailVerifiedAt: new Date(),
        deletionScheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    const authorization = bearer(current.id);
    const codeResponse = await request
      .post("/api/v1/me/sign-in-methods/request")
      .set("Authorization", authorization)
      .send({ email: "taken@example.com" })
      .expect(201);

    const wrong = await request
      .post("/api/v1/me/sign-in-methods/verify")
      .set("Authorization", authorization)
      .send({ email: "taken@example.com", code: "000000" })
      .expect(400);
    expect(wrong.body.code).toBe("INVALID_OTP");

    const taken = await request
      .post("/api/v1/me/sign-in-methods/verify")
      .set("Authorization", authorization)
      .send({ email: "taken@example.com", code: codeResponse.body.testCode })
      .expect(409);
    expect(taken.body.code).toBe(IDENTITY_ERROR_CODES.SIGN_IN_METHOD_TAKEN);
    await expect(prisma.user.findUnique({ where: { id: current.id } })).resolves.toMatchObject({
      phone: "+99361234567",
      email: null,
    });
    await expect(prisma.user.findUnique({ where: { id: owner.id } })).resolves.toMatchObject({
      email: "taken@example.com",
    });
  });

  it("lets the unique index settle concurrent claims", async () => {
    const [first, second] = await Promise.all([
      prisma.user.create({
        data: { phone: "+99361234567", phoneVerifiedAt: new Date() },
      }),
      prisma.user.create({
        data: { phone: "+99362234567", phoneVerifiedAt: new Date() },
      }),
    ]);
    const repository = app.get(PrismaUserRepository);
    const settled = await Promise.allSettled([
      repository.replaceSignInMethod({
        userId: first.id,
        channel: "email",
        destination: "race@example.com",
        verifiedAt: new Date(),
      }),
      repository.replaceSignInMethod({
        userId: second.id,
        channel: "email",
        destination: "race@example.com",
        verifiedAt: new Date(),
      }),
    ]);

    expect(settled.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = settled.find((result) => result.status === "rejected");
    expect(rejected).toMatchObject({
      status: "rejected",
      reason: expect.objectContaining({
        code: IDENTITY_ERROR_CODES.SIGN_IN_METHOD_TAKEN,
      }),
    });
    expect((rejected as PromiseRejectedResult).reason).toBeInstanceOf(IdentityDomainError);
    await expect(prisma.user.count({ where: { email: "race@example.com" } })).resolves.toBe(1);
    const users = await prisma.user.findMany({
      where: { id: { in: [first.id, second.id] } },
      orderBy: { id: "asc" },
    });
    expect(users.map((user) => user.email).sort()).toEqual([
      null,
      "race@example.com",
    ]);
    expect(users.map((user) => user.phone).sort()).toEqual([
      "+99361234567",
      "+99362234567",
    ]);
  });

  it("requires bearer authentication", async () => {
    await request
      .post("/api/v1/me/sign-in-methods/request")
      .send({ email: "new@example.com" })
      .expect(401);
  });
});
