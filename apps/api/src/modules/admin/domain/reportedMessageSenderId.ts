import type { ContentReport } from "./ContentReport";

/** Live Message identity wins; a deleted Message uses only its own saved snapshot. */
export function reportedMessageSenderId(report: ContentReport, message: { senderId: string } | null): string | undefined {
  return message?.senderId ?? (report.messageContext?.messageId === report.targetId
    ? report.messageContext.senderId
    : undefined);
}
