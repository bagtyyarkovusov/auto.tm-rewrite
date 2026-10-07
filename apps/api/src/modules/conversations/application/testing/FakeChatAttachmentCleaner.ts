import type {
  ChatAttachmentCleaner,
  ChatAttachmentCleanResult,
} from "../../domain/ports/ChatAttachmentCleaner";

/**
 * The one `ChatAttachmentCleaner` fake: records every key it was asked to
 * clean and answers with a fixed result. `onClean` lets a spec observe the
 * moment the clean runs, such as what was already stored by then.
 */
export class FakeChatAttachmentCleaner implements ChatAttachmentCleaner {
  result: ChatAttachmentCleanResult = "clean";
  cleaned: string[] = [];

  constructor(private readonly onClean?: () => void) {}

  async clean(key: string): Promise<ChatAttachmentCleanResult> {
    this.cleaned.push(key);
    this.onClean?.();
    return this.result;
  }
}
