import type { PushToken } from "../PushToken";

export interface PushTokenRepository {
  findByToken(token: string): Promise<PushToken | null>;
  findById(id: string): Promise<PushToken | null>;
  listActiveForUser(userId: string): Promise<PushToken[]>;
  save(token: PushToken): Promise<void>;
  update(token: PushToken): Promise<void>;
}

export const PUSH_TOKEN_REPOSITORY = Symbol("PushTokenRepository");
