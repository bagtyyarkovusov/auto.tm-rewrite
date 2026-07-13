import type { DirectMessageNotification } from "../DirectMessageNotification";

export interface PushQueuePort {
  enqueue(notification: DirectMessageNotification): Promise<void>;
}

export const PUSH_QUEUE_PORT = Symbol("PushQueuePort");
