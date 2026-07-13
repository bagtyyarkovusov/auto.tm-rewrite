export interface PushPayload {
  deviceToken: string;
  title: string;
  body: string;
  deepLink: string;
  data: Record<string, unknown>;
}

export type PushResult =
  | { ok: true }
  | { ok: false; reason: "INVALID_TOKEN" }
  | { ok: false; reason: "RETRYABLE"; cause?: unknown }
  | { ok: false; reason: "PERMANENT"; cause?: unknown };

export interface PushPort {
  send(payload: PushPayload): Promise<PushResult>;
}

export const PUSH_PORT = Symbol("PushPort");
