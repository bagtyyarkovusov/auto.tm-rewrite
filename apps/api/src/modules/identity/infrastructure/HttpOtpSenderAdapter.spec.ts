import { afterEach, describe, expect, it } from "vitest";

import { HttpOtpSenderAdapter } from "./HttpOtpSenderAdapter";

const sms = {
  phone: "+99365123456",
  code: "123456",
  purpose: "listing-contact-phone" as const,
  locale: "ru" as const,
  requestId: "00000000-0000-4000-8000-000000000001",
};

describe("HttpOtpSenderAdapter", () => {
  const driver = process.env["SMS_DRIVER"];
  afterEach(() => {
    if (driver === undefined) delete process.env["SMS_DRIVER"];
    else process.env["SMS_DRIVER"] = driver;
  });

  it("builds the sms-gateway body { phone, body, requestId } with the rendered text", () => {
    expect(new HttpOtpSenderAdapter().gatewayRequest(sms)).toEqual({
      phone: "+99365123456",
      body: "AutoTM 123456: номер покажут в объявлении. Не давайте код без согласия",
      requestId: sms.requestId,
    });
  });

  it("renders the text in the seller's locale", () => {
    expect(new HttpOtpSenderAdapter().gatewayRequest({ ...sms, locale: "en" }).body).toBe(
      "AutoTM code 123456 puts this number on a car listing. Share it only if you agree.",
    );
  });

  it.each(["mock", "gateway"])("still only logs in %s mode", async (mode) => {
    process.env["SMS_DRIVER"] = mode;
    await expect(new HttpOtpSenderAdapter().send(sms)).resolves.toBeUndefined();
  });
});
