import { Module } from "@nestjs/common";

import { ListingsModule } from "../listings/listings.module";
import { IdentityModule } from "../identity/identity.module";
import { RealtimeModule } from "../realtime/realtime.module";

import { ConversationsController } from "./presentation/conversations.controller";
import { OpenConversation } from "./application/OpenConversation";
import { ListMyConversations } from "./application/ListMyConversations";
import { ListMessages } from "./application/ListMessages";
import { SendTextMessage } from "./application/SendTextMessage";
import { SendMessage } from "./application/SendMessage";
import { UpdateWatermark } from "./application/UpdateWatermark";
import { MuteConversation } from "./application/MuteConversation";
import { DeleteMessage } from "./application/DeleteMessage";
import { PrismaConversationRepository } from "./infrastructure/PrismaConversationRepository";
import { CONVERSATION_REPOSITORY } from "./domain/ports/ConversationRepository";

@Module({
  imports: [ListingsModule, IdentityModule, RealtimeModule],
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
    SendMessage,
    UpdateWatermark,
    MuteConversation,
    DeleteMessage,
  ],
})
export class ConversationsModule {}
