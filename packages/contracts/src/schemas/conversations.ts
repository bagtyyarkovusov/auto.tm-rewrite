import { z } from "zod";
import { MessageKind } from "../enums";

export const MessageSummarySchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  kind: z.nativeEnum(MessageKind),
  text: z.string().nullable(),
  senderId: z.string().uuid(),
  sentAt: z.string().datetime(),
});
export type MessageSummary = z.infer<typeof MessageSummarySchema>;
