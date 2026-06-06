import { ConversationDomainError, CONVERSATION_ERROR_CODES } from "./types";
import type { ParticipantRole } from "./types";

export class Conversation {
  private constructor(
    readonly id: string,
    readonly listingId: string,
    readonly buyerId: string,
    readonly sellerId: string,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {
    if (buyerId === sellerId) {
      throw new ConversationDomainError(
        CONVERSATION_ERROR_CODES.SELF_CONTACT_NOT_ALLOWED,
        "Buyer and seller cannot be the same user",
      );
    }
  }

  static create(data: {
    id: string;
    listingId: string;
    buyerId: string;
    sellerId: string;
    createdAt?: Date;
    updatedAt?: Date;
  }): Conversation {
    return new Conversation(
      data.id,
      data.listingId,
      data.buyerId,
      data.sellerId,
      data.createdAt ?? new Date(),
      data.updatedAt ?? new Date(),
    );
  }

  isParticipant(userId: string): boolean {
    return userId === this.buyerId || userId === this.sellerId;
  }

  participantRoleOf(userId: string): ParticipantRole | null {
    if (userId === this.buyerId) return "buyer";
    if (userId === this.sellerId) return "seller";
    return null;
  }
}
