/** The four static intents Ask the seller on Listing detail reuses. */
export type QuickReplyIntent = "available" | "seeIt" | "finalPrice" | "condition";

export interface QuickReply {
  key: QuickReplyIntent;
  translationKey: string;
}

export const QUICK_REPLIES: QuickReply[] = [
  { key: "available", translationKey: "quickReplyAvailable" },
  { key: "seeIt", translationKey: "quickReplySeeIt" },
  { key: "finalPrice", translationKey: "quickReplyFinalPrice" },
  { key: "condition", translationKey: "quickReplyCondition" },
];
