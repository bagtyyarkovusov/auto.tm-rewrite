export interface DirectMessagePushInput {
  historyId: string;
  recipientUserId: string;
  title: string;
  body: string;
  deepLink: string;
  data: Record<string, unknown>;
}
