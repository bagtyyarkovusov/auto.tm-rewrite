import { BadRequestException } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { describe, expect, it } from "vitest";

import type { IdentityCheckPort } from "../../identity/identity.public";
import type { ConfirmContactPhone } from "../application/ConfirmContactPhone";
import type { ListMyContactPhones } from "../application/ListMyContactPhones";
import type { RequestContactPhoneCode } from "../application/RequestContactPhoneCode";
import { ContactPhonesController } from "./ContactPhonesController";

function controller(): ContactPhonesController {
  const identityCheck = { isSuspended: async () => false } as unknown as IdentityCheckPort;
  return new ContactPhonesController(
    {} as RequestContactPhoneCode,
    {} as ConfirmContactPhone,
    {} as ListMyContactPhones,
    identityCheck,
  );
}

const req = { user: { sub: "seller-1" }, headers: {}, ip: "127.0.0.1" } as unknown as FastifyRequest;

describe("ContactPhonesController body validation", () => {
  it.each([
    ["request", { phone: "+79161234567" }],
    ["request", {}],
    ["verify", { phone: "+99365123456", code: "12" }],
  ] as const)("answers 400 VALIDATION_FAILED for a malformed %s body", async (route, body) => {
    const error = await controller()[route](req, body).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: "VALIDATION_FAILED",
      details: { fieldErrors: expect.any(Object) },
    });
  });
});
