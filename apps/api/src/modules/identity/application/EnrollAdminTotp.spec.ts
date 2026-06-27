import { describe, it, expect, beforeEach, vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { TotpEnrollment } from "../domain/TotpEnrollment";
import type { TotpEnrollmentRepository } from "../domain/ports/TotpEnrollmentRepository";
import type { TotpSecretCipherPort } from "../domain/ports/TotpSecretCipherPort";
import type { TotpVerifierPort } from "../domain/ports/TotpVerifierPort";
import { EnrollAdminTotp } from "./EnrollAdminTotp";

const NOW = new Date("2026-05-14T12:00:00Z");

class FakeTotpEnrollmentRepository implements TotpEnrollmentRepository {
  enrollments: TotpEnrollment[] = [];

  async findByUserId(userId: string): Promise<TotpEnrollment | null> {
    return this.enrollments.find((e) => e.userId === userId) ?? null;
  }

  async createPending(
    userId: string,
    encryptedSecret: string,
  ): Promise<TotpEnrollment> {
    const enrollment: TotpEnrollment = {
      id: randomUUID(),
      userId,
      encryptedSecret,
      verifiedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    };
    this.enrollments.push(enrollment);
    return enrollment;
  }

  async markVerified(): Promise<void> {}

  async addBackupCodes(): Promise<void> {}

  async findBackupCodes(): Promise<import("../domain/TotpBackupCode").TotpBackupCode[]> {
    return [];
  }

  async consumeBackupCode(): Promise<boolean> {
    return false;
  }

  async completeFirstVerification(): Promise<void> {}

  async consumeBackupCodeAndElevate(): Promise<boolean> {
    return false;
  }

  async deleteByUserId(userId: string): Promise<void> {
    this.enrollments = this.enrollments.filter((e) => e.userId !== userId);
  }
}

class FakeCipher implements TotpSecretCipherPort {
  encrypt(plaintext: string): string {
    return `enc:${plaintext}`;
  }

  decrypt(ciphertext: string): string {
    return ciphertext.replace(/^enc:/, "");
  }
}

class FakeVerifier implements TotpVerifierPort {
  generateSecretCalls = 0;

  generateSecret(): string {
    this.generateSecretCalls += 1;
    return "TESTSECRET12345678";
  }

  generateAuthUri(params: { secret: string; userId: string; issuer: string }): string {
    return `otpauth://totp/${params.issuer}:${params.userId}?secret=${params.secret}`;
  }

  verify(secret: string, code: string): boolean {
    return code === "123456";
  }
}

describe("EnrollAdminTotp", () => {
  let totpRepo: FakeTotpEnrollmentRepository;
  let cipher: FakeCipher;
  let verifier: FakeVerifier;

  beforeEach(() => {
    totpRepo = new FakeTotpEnrollmentRepository();
    cipher = new FakeCipher();
    verifier = new FakeVerifier();
  });

  it("creates a pending enrollment and returns QR + secret", async () => {
    const uc = new EnrollAdminTotp(totpRepo, cipher, verifier);
    const result = await uc.execute({ userId: "user-1" });

    expect(result.secret).toBe("TESTSECRET12345678");
    expect(result.qrCodeUrl).toContain("TESTSECRET12345678");

    expect(totpRepo.enrollments).toHaveLength(1);
    expect(totpRepo.enrollments[0]!.verifiedAt).toBeNull();
    expect(totpRepo.enrollments[0]!.encryptedSecret).toBe("enc:TESTSECRET12345678");
  });

  it("returns an existing pending unverified enrollment without rotating the secret", async () => {
    await totpRepo.createPending("user-1", "enc:old");

    const uc = new EnrollAdminTotp(totpRepo, cipher, verifier);
    const result = await uc.execute({ userId: "user-1" });

    expect(totpRepo.enrollments).toHaveLength(1);
    expect(totpRepo.enrollments[0]!.encryptedSecret).toBe("enc:old");
    expect(verifier.generateSecretCalls).toBe(0);
    expect(result.secret).toBe("old");
    expect(result.qrCodeUrl).toContain("old");
  });

  it("throws TOTP_ALREADY_ENROLLED when verified enrollment exists", async () => {
    const enrollment = await totpRepo.createPending("user-1", "enc:old");
    totpRepo.enrollments = [{ ...enrollment, verifiedAt: NOW }];

    const uc = new EnrollAdminTotp(totpRepo, cipher, verifier);
    await expect(uc.execute({ userId: "user-1" })).rejects.toThrow(
      "TOTP_ALREADY_ENROLLED",
    );
  });
});
