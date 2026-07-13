import { Module } from "@nestjs/common";

import { ListingsModule } from "../listings/listings.module";
import { IdentityModule } from "../identity/identity.module";

import { ConversationsController } from "./presentation/conversations.controller";
import { ConversationGateway } from "./presentation/gateways/ConversationGateway";
import { OpenConversation } from "./application/OpenConversation";
import { ListMyConversations } from "./application/ListMyConversations";
import { ListMessages } from "./application/ListMessages";
import { SendTextMessage } from "./application/SendTextMessage";
import { SendMessage } from "./application/SendMessage";
import { SendPostRefMessage } from "./application/SendPostRefMessage";
import { UpdateWatermark } from "./application/UpdateWatermark";
import { MuteConversation } from "./application/MuteConversation";
import { DeleteMessage } from "./application/DeleteMessage";
import { ValidateConversationAccess } from "./application/ValidateConversationAccess";
import { PrismaConversationRepository } from "./infrastructure/PrismaConversationRepository";
import { CONVERSATION_REPOSITORY } from "./domain/ports/ConversationRepository";

@Module({
  imports: [ListingsModule, IdentityModule],
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
    SendPostRefMessage,
    UpdateWatermark,
    MuteConversation,
    DeleteMessage,
    ValidateConversationAccess,
    ConversationGateway,
  ],
})
export class ConversationsModule {}
