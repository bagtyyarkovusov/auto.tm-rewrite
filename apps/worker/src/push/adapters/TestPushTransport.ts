import type { PushPayload, PushPort, PushResult } from "../domain/PushPort";

export interface RecordedPushDelivery {
  payload: PushPayload;
  result: PushResult;
}

export class TestPushTransport implements PushPort {
  deliveries: RecordedPushDelivery[] = [];
  private behaviors = new Map<string, PushResult>();
  private defaultResult: PushResult = { ok: true };

  async send(payload: PushPayload): Promise<PushResult> {
    const result = this.resolveResult(payload.deviceToken);
    this.deliveries.push({ payload, result });
    return result;
  }

  setResult(token: string, result: PushResult): void {
    this.behaviors.set(token, result);
  }

  setDefaultResult(result: PushResult): void {
    this.defaultResult = result;
  }

  clear(): void {
    this.deliveries = [];
    this.behaviors.clear();
    this.defaultResult = { ok: true };
  }

  private resolveResult(token: string): PushResult {
    return this.behaviors.get(token) ?? this.defaultResult;
  }
}
