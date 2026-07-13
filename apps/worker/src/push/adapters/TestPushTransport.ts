import type { PushPayload, PushPort, PushResult } from "../domain/PushPort";

export interface RecordedPushDelivery {
  payload: PushPayload;
  result: PushResult;
}

export class TestPushTransport implements PushPort {
  deliveries: RecordedPushDelivery[] = [];
  private behaviors = new Map<string, PushResult>();
  private defaultResult: PushResult = { ok: true };

  recordDelivery(payload: PushPayload): void {
    const result = this.behaviors.get(payload.deviceToken) ?? this.defaultResult;
    this.deliveries.push({ payload, result });
  }

  async send(payload: PushPayload): Promise<PushResult> {
    this.recordDelivery(payload);
    return this.behaviors.get(payload.deviceToken) ?? this.defaultResult;
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
}
