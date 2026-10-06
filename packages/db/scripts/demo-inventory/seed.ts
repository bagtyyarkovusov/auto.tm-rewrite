import type { PrismaClient } from "../../generated/prisma/client/client";

import type { PhotoSource } from "./photos";
import type { DemoInventoryResult } from "./result";
import type { ObjectStore } from "./storage";

export async function seedDemoInventory(_deps: {
  prisma: PrismaClient;
  storage: ObjectStore;
  photos: PhotoSource;
  now: Date;
}): Promise<DemoInventoryResult> {
  return { exitCode: 0, message: "not implemented", counts: {} };
}
