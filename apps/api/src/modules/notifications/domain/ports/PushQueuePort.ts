import type { DirectMessageNotification } from "../DirectMessageNotification";

export interface PushQueuePort {
  enqueue(
    notification: DirectMessageNotification,
    historyId: string,
  ): Promise<void>;
}

export const PUSH_QUEUE_PORT = Symbol("PushQueuePort");
