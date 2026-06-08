import { Inject, Injectable } from "@nestjs/common";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { TotpSecretCipherPort } from "../domain/ports/TotpSecretCipherPort";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class AesGcmTotpSecretCipher implements TotpSecretCipherPort {
  constructor(
    @Inject("TOTP_SECRET_ENCRYPTION_KEY")
    private readonly keyBase64: string,
  ) {
    const keyBuffer = Buffer.from(keyBase64, "base64");
    if (keyBuffer.length !== 32) {
      throw new Error(
        `TOTP_SECRET_ENCRYPTION_KEY must be 32 bytes when decoded from base64, got ${keyBuffer.length}`,
      );
    }
  }

  private get key(): Buffer {
    return Buffer.from(this.keyBase64, "base64");
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf-8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    const payload = Buffer.concat([iv, authTag, encrypted]);
    return payload.toString("base64");
  }

  decrypt(ciphertext: string): string {
    const payload = Buffer.from(ciphertext, "base64");
    let offset = 0;

    const iv = payload.subarray(offset, offset + IV_LENGTH);
    offset += IV_LENGTH;

    const authTag = payload.subarray(offset, offset + AUTH_TAG_LENGTH);
    offset += AUTH_TAG_LENGTH;

    const encrypted = payload.subarray(offset);

    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf-8");
  }
}
