import { Module } from "@nestjs/common";

import { ConversationsController } from "./presentation/conversations.controller";

@Module({ controllers: [ConversationsController] })
export class ConversationsModule {}
