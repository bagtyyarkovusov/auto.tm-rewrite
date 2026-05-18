export interface MediaContentClassifierPort {
  classify(key: string): Promise<{
    isAcceptable: boolean;
    reason?: "nsfw" | "not-a-car" | "duplicate" | "unknown";
    confidence: number;
  }>;
}

export const MEDIA_CONTENT_CLASSIFIER_PORT = Symbol(
  "MediaContentClassifierPort",
);
