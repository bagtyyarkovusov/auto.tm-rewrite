import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import type {
  ListingsReadPort,
  ListingSummary,
} from "../../listings/domain/ports/ListingsReadPort";
import { LISTINGS_READ_PORT } from "../../listings/domain/ports/ListingsReadPort";
import {
  IDENTITY_READ_PORT,
  type IdentityReadPort,
} from "../../identity/identity.public";
import type { Conversation } from "../domain/Conversation";
import type { Message } from "../domain/Message";
import {
  CONVERSATION_REPOSITORY,
  type ConversationRepository,
} from "../domain/ports/ConversationRepository";

import { ConversationAccessPolicy } from "./ConversationAccessPolicy";
import {
  peerIdOf,
  readConversationPeers,
  type ConversationPeer,
} from "./ConversationPeers";
import {
  ConversationSendPolicy,
  type SendRestriction,
} from "./ConversationSendPolicy";

export interface GetConversationInput {
  userId: string;
  conversationId: string;
}

/** A list item plus whether the viewer's next Message would be accepted. */
export interface GetConversationResult {
  conversation: Conversation;
  listing: ListingSummary | null;
  lastMessage: Message | null;
  unreadCount: number;
  peerLastReadAt: Date | null;
  peerLastDeliveredAt: Date | null;
  mutedAt: Date | null;
  peer: ConversationPeer;
  blockedByMe: boolean;
  sendRestriction: SendRestriction | null;
}

@Injectable()
export class GetConversation {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepository,
    @Inject(LISTINGS_READ_PORT)
    private readonly listings: ListingsReadPort,
    @Inject(IDENTITY_READ_PORT)
    private readonly identityRead: IdentityReadPort,
    @Inject(ConversationAccessPolicy)
    private readonly accessPolicy: ConversationAccessPolicy,
    @Inject(ConversationSendPolicy)
    private readonly sendPolicy: ConversationSendPolicy,
  ) {}

  async execute(input: GetConversationInput): Promise<GetConversationResult> {
    const conversation = await this.conversations.findById(
      input.conversationId,
    );
    if (!conversation) {
      throw new NotFoundException({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }
    const peerId = this.accessPolicy.assertParticipant(
      conversation,
      input.userId,
    );

    // History stays readable in every restricted case, so a refused send
    // never refuses the read: the restriction is reported, not thrown.
    const listing = await this.listings.getListingSummary(
      conversation.listingId,
    );
    const [peers, states, unreadCount, lastMessage, sendRestriction] =
      await Promise.all([
        readConversationPeers(this.identityRead, input.userId, [conversation]),
        this.conversations.getParticipantStatesForConversations([
          conversation.id,
        ]),
        this.conversations.countUnreadMessages(input.userId, conversation.id),
        this.conversations
          .listMessages(conversation.id, { limit: 1 })
          .then(({ items }) => items[0] ?? null),
        this.sendPolicy.restrictionFor(conversation, input.userId, listing),
      ]);

    const participantStates = states.get(conversation.id) ?? [];
    const peerState = participantStates.find((s) => s.userId !== input.userId);
    const ownState = participantStates.find((s) => s.userId === input.userId);
    const peerView = peers.get(peerIdOf(conversation, input.userId));

    return {
      conversation,
      listing,
      lastMessage,
      unreadCount,
      peerLastReadAt: peerState?.lastReadAt ?? null,
      peerLastDeliveredAt: peerState?.lastDeliveredAt ?? null,
      mutedAt: ownState?.mutedAt ?? null,
      peer: peerView?.peer ?? { id: peerId, displayName: null },
      blockedByMe: peerView?.blockedByMe ?? false,
      sendRestriction,
    };
  }
}
