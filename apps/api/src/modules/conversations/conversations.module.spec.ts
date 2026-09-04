import "reflect-metadata";

import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { RealtimeModule } from "../realtime/realtime.module";

import { ConversationsModule } from "./conversations.module";
import { ConversationAccessPolicy } from "./application/ConversationAccessPolicy";
import { ConversationMessageCommitter } from "./application/ConversationMessageCommitter";
import { ConversationSendPolicy } from "./application/ConversationSendPolicy";
import { SendConversationMessage } from "./application/SendConversationMessage";
import { SendRealtimeMessage } from "./application/SendRealtimeMessage";

describe("ConversationsModule", () => {
  it("imports the realtime presence provider used by ConversationGateway", () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      ConversationsModule,
    ) as unknown[];

    expect(imports).toContain(RealtimeModule);
  });

  it("registers shared conversation access and send-message providers", () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      ConversationsModule,
    ) as unknown[];

    expect(providers).toContain(ConversationAccessPolicy);
    expect(providers).toContain(ConversationMessageCommitter);
    expect(providers).toContain(ConversationSendPolicy);
    expect(providers).toContain(SendConversationMessage);
    expect(providers).toContain(SendRealtimeMessage);
  });
});
