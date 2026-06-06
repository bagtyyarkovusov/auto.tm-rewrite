import { Module } from "@nestjs/common";

import { ListingsModule } from "../listings/listings.module";

import { ConversationsController } from "./presentation/conversations.controller";
import { OpenConversation } from "./application/OpenConversation";
import { ListMyConversations } from "./application/ListMyConversations";
import { ListMessages } from "./application/ListMessages";
import { SendTextMessage } from "./application/SendTextMessage";
import { PrismaConversationRepository } from "./infrastructure/PrismaConversationRepository";
import { CONVERSATION_REPOSITORY } from "./domain/ports/ConversationRepository";

@Module({
  imports: [ListingsModule],
  controllers: [ConversationsController],
  providers: [
    PrismaConversationRepository,
    {
      provide: CONVERSATION_REPOSITORY,
      useClass: PrismaConversationRepository,
    },
    OpenConversation,
    ListMyConversations,
    ListMessages,
    SendTextMessage,
  ],
})
export class ConversationsModule {}
