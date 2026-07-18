import "reflect-metadata";

import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

import { RealtimeModule } from "../realtime/realtime.module";

import { ConversationsModule } from "./conversations.module";

describe("ConversationsModule", () => {
  it("imports the realtime presence provider used by ConversationGateway", () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      ConversationsModule,
    ) as unknown[];

    expect(imports).toContain(RealtimeModule);
  });
});
