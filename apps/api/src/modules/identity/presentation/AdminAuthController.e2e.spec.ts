import "reflect-metadata";

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import supertest from "supertest";
import { generateSync } from "otplib";
import { PrismaService } from "@auto-tm/db";

import { JwtAuthGuard } from "../../../common/jwt-auth.guard";
import { GlobalErrorFilter } from "../../../common/error.filter";
import { IdentityModule } from "../identity.module";

const ADMIN_PHONE = "+99365000001";

describe("AdminAuthController e2e — admin TOTP", () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof supertest>;
  let prisma: PrismaService;
  let previousOtpTestMode: string | undefined;

  beforeAll(async () => {
    previousOtpTestMode = process.env["OTP_TEST_MODE"];
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
    if (previousOtpTestMode === undefined) {
      delete process.env["OTP_TEST_MODE"];
    } else {
      process.env["OTP_TEST_MODE"] = previousOtpTestMode;
    }
    await app.close();
  });

  beforeEach(async () => {
    await prisma.totpBackupCode.deleteMany();
    await prisma.totpEnrollment.deleteMany();
    await prisma.session.deleteMany();
    await prisma.otpRequest.deleteMany();
    await prisma.user.deleteMany();
  });

  async function loginAdmin(): Promise<{ accessToken: string; userId: string }> {
    await prisma.user.upsert({
      where: { phone: ADMIN_PHONE },
      update: { role: "admin" },
      create: { phone: ADMIN_PHONE, role: "admin" },
    });

    const otpRes = await request
      .post("/api/v1/auth/otp/request")
      .send({ phone: ADMIN_PHONE })
      .expect(201);

    const verifyRes = await request
      .post("/api/v1/auth/otp/verify")
      .send({ phone: ADMIN_PHONE, code: otpRes.body.testCode })
      .expect(201);

    expect(verifyRes.body.user.role).toBe("admin");

    return {
      accessToken: verifyRes.body.accessToken as string,
      userId: verifyRes.body.user.id as string,
    };
  }

  function currentTotpCode(secret: string): string {
    return generateSync({ secret, strategy: "totp", period: 30 });
  }

  it("keeps a pending enrollment usable when enroll is called again before first verify", async () => {
    const { accessToken, userId } = await loginAdmin();

    const firstEnroll = await request
      .post("/api/v1/auth/admin/totp/enroll")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(201);
    const firstSecret = firstEnroll.body.secret as string;

    const secondEnroll = await request
      .post("/api/v1/auth/admin/totp/enroll")
      .set("Authorization", `Bearer ${accessToken}`)
      .expect(201);

    expect(secondEnroll.body.secret).toBe(firstSecret);
    expect(secondEnroll.body.qrCodeUrl).toBe(firstEnroll.body.qrCodeUrl);

    const verify = await request
      .post("/api/v1/auth/admin/totp/verify")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ code: currentTotpCode(firstSecret) })
      .expect(201);

    expect(verify.body.adminTotpExpiresAt).toBeDefined();
    expect(verify.body.backupCodes).toHaveLength(10);

    const storedEnrollment = await prisma.totpEnrollment.findUnique({
      where: { userId },
    });
    expect(storedEnrollment?.verifiedAt).toBeInstanceOf(Date);
  });

  it("accepts the same enrolled authenticator secret in a later admin session", async () => {
    const firstLogin = await loginAdmin();

    const enroll = await request
      .post("/api/v1/auth/admin/totp/enroll")
      .set("Authorization", `Bearer ${firstLogin.accessToken}`)
      .expect(201);
    const enrolledSecret = enroll.body.secret as string;

    await request
      .post("/api/v1/auth/admin/totp/verify")
      .set("Authorization", `Bearer ${firstLogin.accessToken}`)
      .send({ code: currentTotpCode(enrolledSecret) })
      .expect(201);

    const secondLogin = await loginAdmin();

    const statusBeforeTotp = await request
      .get("/api/v1/auth/admin/totp/status")
      .set("Authorization", `Bearer ${secondLogin.accessToken}`)
      .expect(200);
    expect(statusBeforeTotp.body.enrolled).toBe(true);
    expect(statusBeforeTotp.body.elevated).toBe(false);

    await request
      .post("/api/v1/auth/admin/totp/enroll")
      .set("Authorization", `Bearer ${secondLogin.accessToken}`)
      .expect(409);

    const verify = await request
      .post("/api/v1/auth/admin/totp/verify")
      .set("Authorization", `Bearer ${secondLogin.accessToken}`)
      .send({ code: currentTotpCode(enrolledSecret) })
      .expect(201);

    expect(verify.body.adminTotpExpiresAt).toBeDefined();
    expect(verify.body.backupCodes).toBeUndefined();

    const statusAfterTotp = await request
      .get("/api/v1/auth/admin/totp/status")
      .set("Authorization", `Bearer ${secondLogin.accessToken}`)
      .expect(200);
    expect(statusAfterTotp.body.enrolled).toBe(true);
    expect(statusAfterTotp.body.elevated).toBe(true);
  });
});
