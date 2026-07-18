import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { ListingsModule } from "../listings/listings.module";
import { IdentityModule } from "../identity/identity.module";
import { RealtimeModule } from "../realtime/realtime.module";

import { ConversationsController } from "./presentation/conversations.controller";
import { ConversationGateway } from "./presentation/gateways/ConversationGateway";
import { OpenConversation } from "./application/OpenConversation";
import { ListMyConversations } from "./application/ListMyConversations";
import { ListMessages } from "./application/ListMessages";
import { SendTextMessage } from "./application/SendTextMessage";
import { SendMessage } from "./application/SendMessage";
import { SendPostRefMessage } from "./application/SendPostRefMessage";
import { PresignChatAttachmentUpload } from "./application/PresignChatAttachmentUpload";
import { UpdateWatermark } from "./application/UpdateWatermark";
import { MuteConversation } from "./application/MuteConversation";
import { DeleteMessage } from "./application/DeleteMessage";
import { ValidateConversationAccess } from "./application/ValidateConversationAccess";
import { PrismaConversationRepository } from "./infrastructure/PrismaConversationRepository";
import { EventEmitterMessageEventPublisher } from "./infrastructure/EventEmitterMessageEventPublisher";
import { CONVERSATION_REPOSITORY } from "./domain/ports/ConversationRepository";
import { MESSAGE_EVENT_PUBLISHER } from "./domain/ports/MessageEventPublisher";
import { CONVERSATION_STATE_PORT } from "./domain/ports/ConversationStatePort";
import { CONVERSATION_REPORT_CONTEXT_PORT } from "./domain/ports/ConversationReportContextPort";

@Module({
  imports: [EventEmitterModule, ListingsModule, IdentityModule, RealtimeModule],
  controllers: [ConversationsController],
  providers: [
    PrismaConversationRepository,
    {
      provide: CONVERSATION_REPOSITORY,
      useClass: PrismaConversationRepository,
    },
    {
      provide: CONVERSATION_STATE_PORT,
      useExisting: CONVERSATION_REPOSITORY,
    },
    {
      provide: CONVERSATION_REPORT_CONTEXT_PORT,
      useExisting: CONVERSATION_REPOSITORY,
    },
    {
      provide: MESSAGE_EVENT_PUBLISHER,
      useClass: EventEmitterMessageEventPublisher,
    },
    OpenConversation,
    ListMyConversations,
    ListMessages,
    SendTextMessage,
    SendMessage,
    SendPostRefMessage,
    PresignChatAttachmentUpload,
    UpdateWatermark,
    MuteConversation,
    DeleteMessage,
    ValidateConversationAccess,
    ConversationGateway,
  ],
  exports: [CONVERSATION_STATE_PORT, CONVERSATION_REPORT_CONTEXT_PORT],
})
export class ConversationsModule {}
