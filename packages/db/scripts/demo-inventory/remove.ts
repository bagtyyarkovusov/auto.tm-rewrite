import type { PrismaClient } from "../../generated/prisma/client/client";

import type { DemoInventoryResult } from "./result";
import type { ObjectStore } from "./storage";

export async function removeDemoInventory(_deps: {
  prisma: PrismaClient;
  storage: ObjectStore;
}): Promise<DemoInventoryResult> {
  return { exitCode: 0, message: "not implemented", counts: {} };
}
