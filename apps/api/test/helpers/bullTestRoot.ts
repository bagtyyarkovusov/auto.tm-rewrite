import { BullModule } from "@nestjs/bullmq";

/**
 * BullMQ root connection for e2e TestingModules.
 *
 * Feature modules register queues (IdentityModule's email-code queue,
 * NotificationsModule's fan-out queue) and leave the connection to the
 * application root, `BullModule.forRoot` in src/app.module.ts. Without that
 * root, @nestjs/bullmq builds each queue with no connection and ioredis dials
 * its default 127.0.0.1:6379 instead of this run's REDIS_URL. In hosted CI
 * nothing listens there, so every suite logged ECONNREFUSED and one stray
 * rejection failed the run. Import this beside the feature modules in every
 * TestingModule whose graph reaches a queue; the guard in
 * test/bullTestRoot.spec.ts enforces it.
 */
export function bullTestRoot() {
  const url = process.env["REDIS_URL"];
  if (!url) {
    throw new Error("REDIS_URL is required for e2e specs that register BullMQ queues");
  }
  return BullModule.forRoot({ connection: { url } });
}
