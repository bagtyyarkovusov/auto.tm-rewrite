import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const currentDir = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(
  resolve(currentDir, "../prisma/schema.prisma"),
  "utf-8",
);

describe("InspectionInterest schema mapping", () => {
  it("maps Prisma fields to the snake-case columns created by the migration", () => {
    const start = schema.indexOf("model InspectionInterest {");
    const end = schema.indexOf("}", start);
    const model = schema.slice(start, end + 1);

    expect(model).toContain('listingId           String   @map("listing_id")');
    expect(model).toContain(
      'requesterUserId     String   @map("requester_user_id")',
    );
    expect(model).toContain('@map("willingness_to_pay_tmt")');
    expect(model).toContain('@map("created_at")');
    expect(model).toContain('@map("updated_at")');
  });
});
