import type { INestApplicationContext } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { Redis } from "ioredis";
import { createAdapter } from "@socket.io/redis-adapter";
import type { Server, ServerOptions } from "socket.io";

export interface RealtimeIoAdapterOptions {
  corsOrigin: string;
  redisAdapterEnabled: boolean;
  redisUrl: string | undefined;
}

export class RealtimeIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(
    appOrHttpServer: INestApplicationContext,
    private readonly options: RealtimeIoAdapterOptions,
  ) {
    super(appOrHttpServer);
  }

  async configure(): Promise<void> {
    if (!this.options.redisAdapterEnabled) {
      return;
    }

    if (!this.options.redisUrl) {
      throw new Error(
        "Redis URL is required when the Socket.IO Redis adapter is enabled",
      );
    }

    const pubClient = new Redis(this.options.redisUrl);
    const subClient = pubClient.duplicate();
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: this.options.corsOrigin,
      },
    }) as Server;
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
