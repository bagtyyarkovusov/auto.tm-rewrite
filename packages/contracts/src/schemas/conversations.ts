import { z } from "zod";

import { ListingStatus } from "../enums";

// ── Shared enums as Zod schemas ──

export const ListingStatusSchema = z.nativeEnum(ListingStatus);
export type ListingStatusType = z.infer<typeof ListingStatusSchema>;

// ── Request DTOs ──

export const OpenConversationRequestSchema = z.object({
  listingId: z.string().uuid(),
});
export type OpenConversationRequest = z.infer<
  typeof OpenConversationRequestSchema
>;

export const SendTextMessageRequestSchema = z.object({
  text: z.string().min(1).max(1000),
});
export type SendTextMessageRequest = z.infer<
  typeof SendTextMessageRequestSchema
>;

// ── Listing card embedded in conversation responses ──

export const ConversationListingCardSchema = z.object({
  id: z.string().uuid(),
  brandId: z.string().uuid(),
  modelId: z.string().uuid(),
  year: z.number().int().min(1900).max(2100).optional(),
  displayPriceTmt: z.number().nonnegative(),
  priceCurrency: z.enum(["TMT", "USD", "AED"]),
  coverMediaKey: z.string().optional(),
  status: ListingStatusSchema,
});
export type ConversationListingCard = z.infer<
  typeof ConversationListingCardSchema
>;

// ── Message summary ──

export const MessageDeliveryStatusSchema = z.enum([
  "pending",
  "sent",
  "failed",
]);
export type MessageDeliveryStatus = z.infer<
  typeof MessageDeliveryStatusSchema
>;

export const MessageSummarySchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  senderId: z.string().uuid(),
  text: z.string(),
  createdAt: z.string().datetime(),
  deliveryStatus: MessageDeliveryStatusSchema.optional(),
});
export type MessageSummary = z.infer<typeof MessageSummarySchema>;

// ── Conversation summary ──

export const ParticipantRoleSchema = z.enum(["buyer", "seller"]);
export type ParticipantRole = z.infer<typeof ParticipantRoleSchema>;

export const ConversationSummarySchema = z.object({
  id: z.string().uuid(),
  listing: ConversationListingCardSchema,
  buyerId: z.string().uuid(),
  sellerId: z.string().uuid(),
  myRole: ParticipantRoleSchema,
  lastMessage: MessageSummarySchema.optional(),
  updatedAt: z.string().datetime(),
});
export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;

// ── Pagination ──

export const ListMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListMessagesQuery = z.infer<typeof ListMessagesQuerySchema>;

export const ListConversationsQuerySchema = ListMessagesQuerySchema;
export type ListConversationsQuery = ListMessagesQuery;

export const ListMessagesResponseSchema = z.object({
  items: z.array(MessageSummarySchema),
  nextCursor: z.string().nullable(),
});
export type ListMessagesResponse = z.infer<typeof ListMessagesResponseSchema>;

// ── Conversation list response ──

export const ListConversationsResponseSchema = z.object({
  items: z.array(ConversationSummarySchema),
  nextCursor: z.string().nullable(),
});
export type ListConversationsResponse = z.infer<
  typeof ListConversationsResponseSchema
>;

// ── Open conversation response ──

export const OpenConversationResponseSchema = ConversationSummarySchema;
export type OpenConversationResponse = z.infer<
  typeof OpenConversationResponseSchema
>;

// ── Send message response ──

export const SendTextMessageResponseSchema = MessageSummarySchema;
export type SendTextMessageResponse = z.infer<
  typeof SendTextMessageResponseSchema
>;
