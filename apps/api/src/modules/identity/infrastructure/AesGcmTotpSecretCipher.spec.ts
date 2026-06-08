import { describe, it, expect } from "vitest";
import { AesGcmTotpSecretCipher } from "./AesGcmTotpSecretCipher";

function random32ByteBase64(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64");
}

describe("AesGcmTotpSecretCipher", () => {
  it("round-trips encryption and decryption", () => {
    const key = random32ByteBase64();
    const cipher = new AesGcmTotpSecretCipher(key);
    const secret = "JBSWY3DPEHPK3PXP";

    const encrypted = cipher.encrypt(secret);
    expect(encrypted).not.toBe(secret);

    const decrypted = cipher.decrypt(encrypted);
    expect(decrypted).toBe(secret);
  });

  it("produces different ciphertexts for the same plaintext", () => {
    const key = random32ByteBase64();
    const cipher = new AesGcmTotpSecretCipher(key);
    const secret = "JBSWY3DPEHPK3PXP";

    const encrypted1 = cipher.encrypt(secret);
    const encrypted2 = cipher.encrypt(secret);
    expect(encrypted1).not.toBe(encrypted2);
  });

  it("fails decryption with a tampered ciphertext", () => {
    const key = random32ByteBase64();
    const cipher = new AesGcmTotpSecretCipher(key);
    const secret = "JBSWY3DPEHPK3PXP";

    const encrypted = cipher.encrypt(secret);
    const tampered = encrypted.slice(0, -4) + "AAAA";

    expect(() => cipher.decrypt(tampered)).toThrow();
  });

  it("fails construction with a non-32-byte key", () => {
    const shortKey = Buffer.from("too-short").toString("base64");
    expect(() => new AesGcmTotpSecretCipher(shortKey)).toThrow(
      "TOTP_SECRET_ENCRYPTION_KEY must be 32 bytes",
    );
  });
});
