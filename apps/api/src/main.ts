import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Logger } from "nestjs-pino";
import { randomUUID } from "node:crypto";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));

  const httpAdapter = app.getHttpAdapter();
  httpAdapter.getInstance().addHook("onRequest", (_req, _reply, done) => {
    const req = _req as any;
    if (!req.headers["x-request-id"]) {
      req.headers["x-request-id"] = randomUUID();
    }
    done();
  });

  app.enableShutdownHooks();

  const port = process.env["PORT"] ?? 3000;
  await app.listen(port, "0.0.0.0");
  app.get(Logger).log(`API listening on port ${port}`, "NestApplication");
}

bootstrap();
