import {
  Inject,
  Injectable,
  type OnApplicationShutdown,
} from "@nestjs/common";
import type {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from "@nestjs/websockets";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";

import { SocketAuthMiddleware } from "./SocketAuthMiddleware";
import { SocketConnectionRegistry } from "./SocketConnectionRegistry";
import { REALTIME_NAMESPACE, userRoom } from "./realtime.config";

@Injectable()
@WebSocketGateway({
  namespace: REALTIME_NAMESPACE,
})
export class RealtimeGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnApplicationShutdown
{
  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(SocketAuthMiddleware)
    private readonly authMiddleware: SocketAuthMiddleware,
    @Inject(SocketConnectionRegistry)
    private readonly registry: SocketConnectionRegistry,
  ) {}

  afterInit(server: Server): void {
    server.use((socket, next) => this.authMiddleware.use(socket, next));
  }

  handleConnection(client: Socket): void {
    const user = client.data.user;
    if (!user?.sub) {
      client.disconnect(true);
      return;
    }

    client.join(userRoom(user.sub));
    this.registry.register(client.id, user.sub);
  }

  handleDisconnect(client: Socket): void {
    this.registry.unregister(client.id);
  }

  onApplicationShutdown(): void {
    this.server?.close();
  }
}
