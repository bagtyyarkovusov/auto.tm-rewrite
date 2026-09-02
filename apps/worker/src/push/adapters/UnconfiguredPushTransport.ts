import type { PushPayload, PushPort, PushResult } from "../domain/PushPort";
import { PUSH_RESULT_REASON } from "../domain/types";

/**
 * Placeholder for a selected `PUSH_TRANSPORT` that has no adapter yet — today
 * only `ntfy` (ADR-0009's unimplemented fallback). Fails permanently rather
 * than silently succeeding, so a misconfigured deploy is visible in history.
 */
export class UnconfiguredPushTransport implements PushPort {
  constructor(private readonly transport: string) {}

  async send(_payload: PushPayload): Promise<PushResult> {
    return {
      ok: false,
      reason: PUSH_RESULT_REASON.Permanent,
      cause: `push transport "${this.transport}" has no adapter in this build`,
    };
  }
}
