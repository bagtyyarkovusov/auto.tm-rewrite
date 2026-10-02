import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { ConversationsSchemas } from "@auto-tm/contracts";

import type { ListingSummary, ListingsReadPort } from "../../listings/domain/ports/ListingsReadPort";
import { LISTINGS_READ_PORT } from "../../listings/domain/ports/ListingsReadPort";
import type { Conversation } from "../domain/Conversation";
import { CONVERSATION_ERROR_CODES } from "../domain/types";
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepository,
} from "../domain/ports/ConversationRepository";

import { ConversationAccessPolicy } from "./ConversationAccessPolicy";
import { peerIdOf } from "./ConversationPeers";

/** Why a Message would be refused. See `ConversationSendPolicy.restrictionFor`. */
export type SendRestriction =
  | "blocked_by_me"
  | "listing_unavailable"
  | "chat_disabled"
  | "participant_unavailable";

type MustBeTrue<T extends true> = T;
type SameMembers<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/**
 * Compile-time tie to the wire contract: it stops compiling when a restriction
 * exists on only one side of `SendRestriction` and the contract's
 * `SendRestrictionSchema`.
 */
export type SendRestrictionMatchesContract = MustBeTrue<
  SameMembers<SendRestriction, ConversationsSchemas.SendRestriction>
>;

export interface AuthorizedConversationSend {
  conversation: Conversation;
  listing: ListingSummary;
  recipientId: string;
}

@Injectable()
export class ConversationSendPolicy {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(LISTINGS_READ_PORT)
    private readonly listings: ListingsReadPort,
    @Inject(ConversationAccessPolicy)
    private readonly accessPolicy: ConversationAccessPolicy,
  ) {}

  async authorize(
    conversationId: string,
    senderId: string,
  ): Promise<AuthorizedConversationSend> {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    const recipientId = this.accessPolicy.assertParticipant(
      conversation,
      senderId,
    );
    const listing = await this.loadContactableListing(conversation.listingId);
    await this.accessPolicy.assertParticipantSafety({
      userId: senderId,
      otherParticipantId: recipientId,
      otherParticipantSuspendedMessage: "User is suspended",
    });

    return { conversation, listing, recipientId };
  }

  /**
   * Whether the viewer's next Message would be refused, without throwing.
   * It applies the same Listing rule and reads the same participant-safety
   * facts as `authorize`. The caller has already checked that the viewer is a
   * participant and supplies the Listing it loaded (null when banned or
   * deleted). When several rules refuse a send, `blocked_by_me` comes first
   * so the app can offer Unblock, then the Listing rules, then
   * `participant_unavailable`.
   */
  async restrictionFor(
    conversation: Conversation,
    viewerId: string,
    listing: ListingSummary | null,
  ): Promise<SendRestriction | null> {
    const safety = await this.accessPolicy.readParticipantSafety(
      viewerId,
      peerIdOf(conversation, viewerId),
    );

    if (safety.blockedByViewer) return "blocked_by_me";
    const check = checkListing(listing);
    if (!check.contactable) return check.restriction;
    if (
      safety.viewerSuspended ||
      safety.otherSuspended ||
      safety.blockedByOther
    ) {
      return "participant_unavailable";
    }
    return null;
  }

  private async loadContactableListing(
    listingId: string,
  ): Promise<ListingSummary> {
    const check = checkListing(await this.listings.getListingSummary(listingId));
    if (!check.contactable) {
      throw new ForbiddenException({
        code: "FORBIDDEN",
        message: check.message,
        details: { reason: check.reason },
      });
    }
    return check.listing;
  }
}

type ListingCheck =
  | { contactable: true; listing: ListingSummary }
  | {
      contactable: false;
      restriction: SendRestriction;
      message: string;
      reason: string;
    };

/** The one place that decides whether a Listing accepts Messages. */
function checkListing(listing: ListingSummary | null): ListingCheck {
  if (!listing) {
    return {
      contactable: false,
      restriction: "listing_unavailable",
      message: "Listing is no longer available for contact",
      reason: CONVERSATION_ERROR_CODES.LISTING_NOT_CONTACTABLE,
    };
  }
  if (listing.status !== "active") {
    return {
      contactable: false,
      restriction: "listing_unavailable",
      message: "Listing is not available for contact",
      reason: CONVERSATION_ERROR_CODES.LISTING_NOT_CONTACTABLE,
    };
  }
  if (!listing.allowChat) {
    return {
      contactable: false,
      restriction: "chat_disabled",
      message: "Chat is disabled for this listing",
      reason: CONVERSATION_ERROR_CODES.CHAT_DISABLED,
    };
  }
  return { contactable: true, listing };
}
