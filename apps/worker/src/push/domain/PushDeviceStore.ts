import type { PushPlatform } from "./types";

export interface ActivePushDevice {
  token: string;
  platform: PushPlatform;
}

export interface PushDeviceStore {
  listActiveForUser(userId: string): Promise<ActivePushDevice[]>;
  invalidateToken(token: string): Promise<void>;
}

export const PUSH_DEVICE_STORE = Symbol("PushDeviceStore");
