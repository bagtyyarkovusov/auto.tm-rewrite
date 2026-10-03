import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { Enums } from "@auto-tm/contracts";

describe("Sign-in Code purpose storage (ADR-0081)", () => {
  // Reading the schema text needs no generated client, so this runs in the
  // unit lane.
  const schema = readFileSync(
    resolve(__dirname, "../../../../../../packages/db/prisma/schema.prisma"),
    "utf-8",
  );

  function block(kind: "enum" | "model", name: string): string[] {
    const body = new RegExp(`${kind} ${name} \\{([^}]*)\\}`).exec(schema)?.[1];
    if (body === undefined) throw new Error(`${kind} ${name} not found in schema.prisma`);
    return body
      .split("\n")
      .map((line) => line.replace(/\/\/.*$/, "").trim())
      .filter((line) => line.length > 0);
  }

  it("stores each contract purpose as one CodePurpose value", () => {
    expect(block("enum", "CodePurpose").sort()).toEqual(
      Object.values(Enums.SignInCodePurpose)
        .map((purpose) => purpose.replaceAll("-", "_"))
        .sort(),
    );
  });

  it("requires a purpose on every otp_requests row, with no default", () => {
    const purpose = block("model", "OtpRequest").find((line) => line.startsWith("purpose "));
    expect(purpose?.split(/\s+/)).toEqual(["purpose", "CodePurpose"]);
  });
});
