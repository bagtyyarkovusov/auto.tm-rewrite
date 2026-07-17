export interface ConversationStatePort {
  isMuted(conversationId: string, userId: string): Promise<boolean>;
}

export const CONVERSATION_STATE_PORT = Symbol("ConversationStatePort");
