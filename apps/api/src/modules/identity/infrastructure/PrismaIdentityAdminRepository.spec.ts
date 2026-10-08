import { describe, expect, it } from "vitest";
import type { PrismaService } from "@auto-tm/db";

import { PrismaIdentityAdminRepository } from "./PrismaIdentityAdminRepository";

describe("Identity suspension", () => {
  it("revokes only the suspended User's Sessions on the supplied transaction", async () => {
    let sessions = [{ userId: "sender" }, { userId: "sender" }, { userId: "other" }];
    const tx = {
      user: { update: async () => ({ suspendedAt: new Date(), suspendedById: "admin", suspensionReason: "Spam" }) },
      session: { deleteMany: async ({ where }: { where: { userId: string } }) => {
        sessions = sessions.filter((session) => session.userId !== where.userId);
      } },
    };
    const root = { user: { update: async () => { throw new Error("Must use transaction"); } } };
    const identity = new PrismaIdentityAdminRepository(root as unknown as PrismaService);
    expect(await identity.suspendUser("sender", "admin", "Spam", tx)).toMatchObject({ suspendedById: "admin", suspensionReason: "Spam" });
    expect(sessions).toEqual([{ userId: "other" }]);
  });
});
