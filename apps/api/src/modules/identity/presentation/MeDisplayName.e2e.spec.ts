import "reflect-metadata";

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";
import { JwtModule, JwtService } from "@nestjs/jwt";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import supertest from "supertest";
import { PrismaService } from "@auto-tm/db";

import { IdentityModule } from "../identity.module";
import { IDENTITY_CHECK_PORT } from "../identity.public";
import { AccountDeletionPendingGuard } from "../../../common/account-deletion-pending.guard";
import { GlobalErrorFilter } from "../../../common/error.filter";
import { JwtAuthGuard } from "../../../common/jwt-auth.guard";
import { cleanSuiteFixtures, defineE2eSuite } from "../../../../test/helpers/e2eSuite";
import { bullTestRoot } from "../../../../test/helpers/bullTestRoot";
import { mintUserJwt } from "../../../../test/helpers/mintUserJwt";

const suite = defineE2eSuite("me-display-name");
const SUITE_USERS = ["first", "second"] as const;
const FIRST = suite.id("first");
const SECOND = suite.id("second");

describe("PATCH /api/v1/me e2e", () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof supertest>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        bullTestRoot(),
        IdentityModule,
        JwtModule.register({
          global: true,
          secret: process.env["JWT_ACCESS_SECRET"] ?? "dev-secret-change-me",
          signOptions: { expiresIn: "1h" },
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    const reflector = app.get(Reflector);
    app.useGlobalGuards(
      new JwtAuthGuard(reflector, app.get(JwtService)),
      new AccountDeletionPendingGuard(reflector, app.get(IDENTITY_CHECK_PORT)),
    );
    app.useGlobalFilters(new GlobalErrorFilter());
    await app.listen(0, "127.0.0.1");
    request = supertest(app.getHttpServer());
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await cleanSuiteFixtures(prisma, suite, { userAliases: SUITE_USERS });
    await app.close();
  });

  beforeEach(async () => {
    await cleanSuiteFixtures(prisma, suite, { userAliases: SUITE_USERS });
    await prisma.user.create({
      data: {
        id: FIRST,
        phone: suite.phone("first"),
        phoneVerifiedAt: new Date("2026-05-01T00:00:00Z"),
        nameNumber: 4821,
        avatarIndex: 7,
      },
    });
    await prisma.user.create({
      data: {
        id: SECOND,
        phone: suite.phone("second"),
        phoneVerifiedAt: new Date("2026-05-01T00:00:00Z"),
        nameNumber: 1000,
        avatarIndex: 0,
      },
    });
  });

  function patch(userId: string | null, body: unknown) {
    const req = request.patch("/api/v1/me");
    if (userId) req.set("Authorization", `Bearer ${mintUserJwt(userId)}`);
    return req.send(body as object);
  }

  it("stores the normalized name, answers with /me, and GET /me returns it", async () => {
    const res = await patch(FIRST, { displayName: "  Aman   Durdy " }).expect(200);

    const me = await request
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${mintUserJwt(FIRST)}`)
      .expect(200);
    expect(res.body).toEqual(me.body);
    expect(me.body).toMatchObject({
      id: FIRST,
      displayName: "Aman Durdy",
      nameNumber: 4821,
      avatarIndex: 7,
      avatarKey: null,
      phone: suite.phone("first"),
    });
  });

  it("accepts a 30-letter Turkmen name", async () => {
    const res = await patch(FIRST, { displayName: "ýňş".repeat(10) }).expect(200);

    expect(res.body.displayName).toBe("ýňş".repeat(10));
  });

  it("stores a name sent with a NUL character without it, instead of failing", async () => {
    const res = await patch(FIRST, { displayName: "Am\u0000an" }).expect(200);

    expect(res.body.displayName).toBe("Aman");
    const row = await prisma.user.findUnique({ where: { id: FIRST } });
    expect(row?.displayName).toBe("Aman");
  });

  it("lets two Users hold the same name", async () => {
    await patch(FIRST, { displayName: "Aman" }).expect(200);
    await patch(SECOND, { displayName: "Aman" }).expect(200);

    const rows = await prisma.user.findMany({
      where: { id: { in: [FIRST, SECOND] } },
      select: { displayName: true },
    });
    expect(rows.map((r) => r.displayName)).toEqual(["Aman", "Aman"]);
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["A", "too_short"],
    ["a".repeat(31), "too_long"],
  ])("refuses %j with 400 INVALID_DISPLAY_NAME (%s) and stores nothing", async (raw, reason) => {
    const res = await patch(FIRST, { displayName: raw }).expect(400);

    expect(res.body).toMatchObject({
      code: "INVALID_DISPLAY_NAME",
      details: { reason },
    });
    const row = await prisma.user.findUnique({ where: { id: FIRST } });
    expect(row!.displayName).toBeNull();
  });

  it("changes nothing but the name when the body carries other fields", async () => {
    await patch(FIRST, {
      displayName: "Aman",
      nameNumber: 1,
      avatarIndex: 0,
      avatarKey: "uploads/x.jpg",
      phone: "+99365000000",
      role: "admin",
    }).expect(200);

    const row = await prisma.user.findUnique({ where: { id: FIRST } });
    expect(row).toMatchObject({
      displayName: "Aman",
      nameNumber: 4821,
      avatarIndex: 7,
      avatarKey: null,
      phone: suite.phone("first"),
      role: "buyer",
    });
  });

  it("answers 401 without a session", async () => {
    await patch(null, { displayName: "Aman" }).expect(401);
  });

  it("refuses a User whose deletion is scheduled", async () => {
    await prisma.user.update({
      where: { id: FIRST },
      data: { deletionScheduledAt: new Date() },
    });

    const res = await patch(FIRST, { displayName: "Aman" }).expect(403);

    expect(res.body.details).toMatchObject({ reason: "ACCOUNT_DELETION_PENDING" });
    const row = await prisma.user.findUnique({ where: { id: FIRST } });
    expect(row!.displayName).toBeNull();
  });

  it("refuses a suspended User", async () => {
    await prisma.user.update({
      where: { id: FIRST },
      data: { suspendedAt: new Date() },
    });

    const res = await patch(FIRST, { displayName: "Aman" }).expect(403);

    expect(res.body).toMatchObject({
      code: "FORBIDDEN",
      details: { reason: "USER_SUSPENDED" },
    });
    const row = await prisma.user.findUnique({ where: { id: FIRST } });
    expect(row!.displayName).toBeNull();
  });
});
