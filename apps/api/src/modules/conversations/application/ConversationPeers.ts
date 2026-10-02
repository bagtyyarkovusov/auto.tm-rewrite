import type { IdentityReadPort } from "../../identity/identity.public";

export interface ConversationPeer {
  id: string;
  displayName: string | null;
}

export interface ConversationPeerView {
  peer: ConversationPeer;
  blockedByMe: boolean;
}

interface Participants {
  buyerId: string;
  sellerId: string;
}

export function peerIdOf(conversation: Participants, viewerId: string): string {
  return viewerId === conversation.buyerId
    ? conversation.sellerId
    : conversation.buyerId;
}

/**
 * Reads the other participant's display name and the viewer's block state for
 * a set of Conversations with one identity read each, however many rows.
 * A peer that no longer exists keeps a null display name.
 */
export async function readConversationPeers(
  identityRead: IdentityReadPort,
  viewerId: string,
  conversations: Participants[],
): Promise<Map<string, ConversationPeerView>> {
  const peerIds = [
    ...new Set(conversations.map((c) => peerIdOf(c, viewerId))),
  ];
  if (peerIds.length === 0) return new Map();

  const [users, blockedIds] = await Promise.all([
    identityRead.findUsersByIds(peerIds),
    identityRead.findBlockedUserIds(viewerId, peerIds),
  ]);
  const displayNames = new Map(users.map((u) => [u.id, u.displayName]));
  const blocked = new Set(blockedIds);

  return new Map(
    peerIds.map((id) => [
      id,
      {
        peer: { id, displayName: displayNames.get(id) ?? null },
        blockedByMe: blocked.has(id),
      },
    ]),
  );
}
