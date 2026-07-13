import type { PUSH_RESULT_REASON } from "./types";

export interface PushPayload {
  deviceToken: string;
  title: string;
  body: string;
  deepLink: string;
  data: Record<string, unknown>;
}

export type PushResult =
  | { ok: true }
  | { ok: false; reason: typeof PUSH_RESULT_REASON.InvalidToken }
  | { ok: false; reason: typeof PUSH_RESULT_REASON.Retryable; cause?: unknown }
  | { ok: false; reason: typeof PUSH_RESULT_REASON.Permanent; cause?: unknown };

export interface PushPort {
  send(payload: PushPayload): Promise<PushResult>;
}

export const PUSH_PORT = Symbol("PushPort");
