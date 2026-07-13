import { Module } from "@nestjs/common";

import { PRESENCE_PORT } from "./domain/ports/PresencePort";
import { RealtimeGateway } from "./infrastructure/RealtimeGateway";
import { SocketAuthMiddleware } from "./infrastructure/SocketAuthMiddleware";
import { SocketConnectionRegistry } from "./infrastructure/SocketConnectionRegistry";

@Module({
  providers: [
    SocketAuthMiddleware,
    SocketConnectionRegistry,
    RealtimeGateway,
    {
      provide: PRESENCE_PORT,
      useExisting: SocketConnectionRegistry,
    },
  ],
  exports: [PRESENCE_PORT],
})
export class RealtimeModule {}
