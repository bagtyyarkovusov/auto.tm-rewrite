import { Inject, Injectable } from "@nestjs/common";
import type { TotpEnrollmentRepository } from "../domain/ports/TotpEnrollmentRepository";
import type { TotpSecretCipherPort } from "../domain/ports/TotpSecretCipherPort";
import type { TotpVerifierPort } from "../domain/ports/TotpVerifierPort";
import { PrismaTotpEnrollmentRepository } from "../infrastructure/PrismaTotpEnrollmentRepository";
import { AesGcmTotpSecretCipher } from "../infrastructure/AesGcmTotpSecretCipher";
import { OtplibTotpVerifier } from "../infrastructure/OtplibTotpVerifier";

export interface EnrollAdminTotpInput {
  userId: string;
}

export interface EnrollAdminTotpResult {
  qrCodeUrl: string;
  secret: string;
}

@Injectable()
export class EnrollAdminTotp {
  constructor(
    @Inject(PrismaTotpEnrollmentRepository)
    private readonly totpRepo: TotpEnrollmentRepository,
    @Inject(AesGcmTotpSecretCipher)
    private readonly cipher: TotpSecretCipherPort,
    @Inject(OtplibTotpVerifier)
    private readonly verifier: TotpVerifierPort,
  ) {}

  async execute(input: EnrollAdminTotpInput): Promise<EnrollAdminTotpResult> {
    const existing = await this.totpRepo.findByUserId(input.userId);

    if (existing?.verifiedAt != null) {
      const err = new Error("TOTP_ALREADY_ENROLLED");
      err.name = "ConflictError";
      throw err;
    }

    if (existing != null) {
      // Pending unverified enrollment may be replaced
      await this.totpRepo.deleteByUserId(input.userId);
    }

    const secret = this.verifier.generateSecret();
    const encryptedSecret = this.cipher.encrypt(secret);

    await this.totpRepo.createPending(input.userId, encryptedSecret);

    const qrCodeUrl = this.verifier.generateAuthUri({
      secret,
      userId: input.userId,
      issuer: "auto.tm Admin",
    });

    return { qrCodeUrl, secret };
  }
}
