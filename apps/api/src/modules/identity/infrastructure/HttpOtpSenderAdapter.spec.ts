import { Logger } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpOtpSenderAdapter } from "./HttpOtpSenderAdapter";

// The code is deliberately not a suffix of the phone: a code that shares
// digits with the mask would let a masking regression pass by coincidence.
const sms = {
  phone: "+99365123456",
  code: "709814",
  purpose: "listing-contact-phone" as const,
  locale: "ru" as const,
  requestId: "00000000-0000-4000-8000-000000000001",
};

describe("HttpOtpSenderAdapter", () => {
  const driver = process.env["SMS_DRIVER"];
  afterEach(() => {
    vi.restoreAllMocks();
    if (driver === undefined) delete process.env["SMS_DRIVER"];
    else process.env["SMS_DRIVER"] = driver;
  });

  it("builds the sms-gateway body { phone, body, requestId } with the rendered text", () => {
    expect(new HttpOtpSenderAdapter().gatewayRequest(sms)).toEqual({
      phone: "+99365123456",
      body: "AutoTM 709814: номер покажут в объявлении. Не давайте код без согласия",
      requestId: sms.requestId,
    });
  });

  it("renders the text in the seller's locale", () => {
    expect(new HttpOtpSenderAdapter().gatewayRequest({ ...sms, locale: "en" }).body).toBe(
      "AutoTM code 709814 puts this number on a car listing. Share it only if you agree.",
    );
  });

  it.each(["mock", "gateway"])("still only logs in %s mode", async (mode) => {
    process.env["SMS_DRIVER"] = mode;
    await expect(new HttpOtpSenderAdapter().send(sms)).resolves.toBeUndefined();
  });

  it.each(["mock", "gateway"])(
    "writes only the last four digits of the phone number to the log in %s mode",
    async (mode) => {
      process.env["SMS_DRIVER"] = mode;
      const lines: string[] = [];
      vi.spyOn(Logger.prototype, "log").mockImplementation((line: unknown) => {
        lines.push(String(line));
      });

      await new HttpOtpSenderAdapter().send(sms);

      expect(lines).toHaveLength(1);
      expect(lines[0]).toContain("***3456");
      expect(lines[0]).not.toContain("+99365123456");
      expect(lines[0]).not.toContain("65123456");
    },
  );

  it("keeps the code in the mock log line, which is how a code is read where no SMS is sent", async () => {
    process.env["SMS_DRIVER"] = "mock";
    const lines: string[] = [];
    vi.spyOn(Logger.prototype, "log").mockImplementation((line: unknown) => {
      lines.push(String(line));
    });

    await new HttpOtpSenderAdapter().send(sms);

    // The fingerprint is sha256("+99365123456")'s first six hex digits: two
    // phones that share their last four no longer produce the same line.
    expect(lines).toEqual(["[mock] OTP for ***3456 (fp 50d3ac): 709814"]);
  });

  it("never writes the code to the log in gateway mode", async () => {
    process.env["SMS_DRIVER"] = "gateway";
    const lines: string[] = [];
    vi.spyOn(Logger.prototype, "log").mockImplementation((line: unknown) => {
      lines.push(String(line));
    });

    await new HttpOtpSenderAdapter().send(sms);

    expect(lines.join("")).not.toContain("709814");
  });
});
