import { describe, expect, it } from "vitest";

import { PrismaIdentityCheckAdapter } from "./PrismaIdentityCheckAdapter";

function adapterWith(users: Array<{ id: string; phone: string | null }>) {
  const prisma = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const user = users.find((u) => u.id === where.id);
        return user ? { phone: user.phone } : null;
      },
    },
  };
  return new PrismaIdentityCheckAdapter(
    prisma as unknown as ConstructorParameters<typeof PrismaIdentityCheckAdapter>[0],
  );
}

describe("PrismaIdentityCheckAdapter.holdsSignInPhone", () => {
  const adapter = adapterWith([
    { id: "user-1", phone: "+99361234567" },
    { id: "email-only", phone: null },
  ]);

  it("is true only for the User's own sign-in phone", async () => {
    expect(await adapter.holdsSignInPhone("user-1", "+99361234567")).toBe(true);
    expect(await adapter.holdsSignInPhone("user-1", "+99365123456")).toBe(false);
  });

  it("is false for a User without a phone or an unknown User", async () => {
    expect(await adapter.holdsSignInPhone("email-only", "+99361234567")).toBe(false);
    expect(await adapter.holdsSignInPhone("missing", "+99361234567")).toBe(false);
  });
});
