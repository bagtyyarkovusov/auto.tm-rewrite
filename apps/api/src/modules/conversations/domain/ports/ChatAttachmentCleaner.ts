/**
 * `clean`: the stored image is upright and carries no metadata.
 * `missing`: nothing is stored at the key.
 * `invalid`: the stored object is not a usable image.
 */
export type ChatAttachmentCleanResult = "clean" | "missing" | "invalid";

export interface ChatAttachmentCleaner {
  clean(key: string): Promise<ChatAttachmentCleanResult>;
}

export const CHAT_ATTACHMENT_CLEANER = Symbol("ChatAttachmentCleaner");
