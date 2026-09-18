import "reflect-metadata";

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { EventEmitter2, EventEmitterModule } from "@nestjs/event-emitter";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import supertest from "supertest";
import { io, type Socket as ClientSocket } from "socket.io-client";
import { PrismaService } from "@auto-tm/db";
import type { Prisma } from "@auto-tm/db";

import { ConversationsModule } from "../conversations.module";
import { ListingsModule } from "../../listings/listings.module";
import { IdentityModule } from "../../identity/identity.module";
import { IMAGE_VARIANT_GENERATOR } from "../../listings/domain/ports/ImageVariantGenerator";
import { LISTING_EVENT_PUBLISHER } from "../../listings/domain/ports/ListingEventPublisher";
import { RealtimeIoAdapter } from "../../realtime/infrastructure/RealtimeIoAdapter";
import { REALTIME_NAMESPACE } from "../../realtime/infrastructure/realtime.config";
import type { MessageSentEvent } from "../domain/ports/MessageEventPublisher";
import { GlobalErrorFilter } from "../../../common/error.filter";
import { JwtAuthGuard } from "../../../common/jwt-auth.guard";
import { EnvSchema } from "../../../env.schema";
import { mintUserJwt } from "../../../../test/helpers/mintUserJwt";
import {
  cleanSuiteFixtures,
  defineE2eSuite,
  seedSuiteCatalog,
} from "../../../../test/helpers/e2eSuite";

const suite = defineE2eSuite("conversation-broadcast");
type SuiteUser = "seller-1" | "buyer-1";
const SUITE_USERS: readonly SuiteUser[] = ["seller-1", "buyer-1"];

// Long enough for a second, unwanted message:new to arrive on a local socket.
const SETTLE_MS = 300;

type MessageNew = { message: Record<string, unknown> & { id: string } };

describe("Conversation message broadcast e2e", () => {
  let app: NestFastifyApplication;
  let request: ReturnType<typeof supertest>;
  let prisma: PrismaService;
  let baseUrl: string;
  let messageSentEvents: MessageSentEvent[];
  const sockets: ClientSocket[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          validate: (cfg) => EnvSchema.parse(cfg),
        }),
        EventEmitterModule.forRoot(),
        IdentityModule,
        ListingsModule,
        ConversationsModule,
        JwtModule.register({
          global: true,
          secret: process.env["JWT_ACCESS_SECRET"] ?? "dev-secret-change-me",
          signOptions: { expiresIn: "1h" },
        }),
      ],
    })
      .overrideProvider(IMAGE_VARIANT_GENERATOR)
      .useValue({
        generate: async (originalKey: string) => ({
          variants: {
            thumbnail: `${originalKey}/thumbnail.jpg`,
            list: `${originalKey}/list.jpg`,
            detail: `${originalKey}/detail.jpg`,
            fullscreen: `${originalKey}/fullscreen.jpg`,
          },
        }),
      })
      .overrideProvider(LISTING_EVENT_PUBLISHER)
      .useValue({ emit: async () => {} })
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    const adapter = new RealtimeIoAdapter(app, {
      corsOrigin: "*",
      redisAdapterEnabled: false,
      redisUrl: undefined,
    });
    await adapter.configure();
    app.useWebSocketAdapter(adapter);
    const reflector = app.get(Reflector);
    const jwtService = app.get(JwtService);
    app.useGlobalGuards(new JwtAuthGuard(reflector, jwtService));
    app.useGlobalFilters(new GlobalErrorFilter());
    await app.listen(0, "127.0.0.1");
    baseUrl = await app.getUrl();
    request = supertest(app.getHttpServer());
    prisma = app.get(PrismaService);

    // Counts the event that drives push, so the suite can prove each send
    // still publishes it exactly once.
    app.get(EventEmitter2).on("MessageSent", (event: MessageSentEvent) => {
      messageSentEvents.push(event);
    });
  }, 60_000);

  afterAll(async () => {
    await app.close();
  }, 60_000);

  beforeEach(async () => {
    messageSentEvents = [];
    await cleanSuiteFixtures(prisma, suite, { userAliases: SUITE_USERS });
  });

  afterEach(() => {
    for (const socket of sockets.splice(0)) {
      socket.disconnect();
    }
  });

  async function createUser(alias: SuiteUser): Promise<string> {
    await prisma.user.create({
      data: { id: suite.id(alias), phone: suite.phone(alias), role: "buyer" },
    });
    return mintUserJwt(suite.id(alias));
  }

  async function publishListing(sellerToken: string): Promise<string> {
    await seedSuiteCatalog(prisma, suite);
    // TMT→TMT is a shared global singleton — upsert, never delete.
    await prisma.exchangeRate.upsert({
      where: { fromCurrency_toCurrency: { fromCurrency: "TMT", toCurrency: "TMT" } },
      create: { fromCurrency: "TMT", toCurrency: "TMT", rate: 1 },
      update: { rate: 1 },
    });
    const draft = await prisma.listingDraft.create({
      data: {
        userId: suite.id("seller-1"),
        payload: {
          brandId: suite.catalog.brandId,
          modelId: suite.catalog.modelId,
          cityId: suite.catalog.cityId,
          regionId: suite.catalog.regionId,
          priceAmount: 100000,
          priceCurrency: "TMT",
          year: 2020,
          condition: "used",
          mileageKm: 50000,
          description: "Broadcast test car",
          allowCalls: true,
          allowChat: true,
          photos: [
            { photoId: suite.id("photo-1"), key: "photo1.jpg", sortOrder: 0 },
          ],
        } as Prisma.InputJsonValue,
      },
    });
    const res = await request
      .post(`/api/v1/listings/drafts/${draft.id}/publish`)
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({})
      .expect(201);
    return res.body.id as string;
  }

  async function seedConversation() {
    const sellerToken = await createUser("seller-1");
    const buyerToken = await createUser("buyer-1");
    const listingId = await publishListing(sellerToken);
    const res = await request
      .post("/api/v1/conversations")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ listingId })
      .expect(201);
    return {
      sellerToken,
      buyerToken,
      listingId,
      conversationId: res.body.id as string,
    };
  }

  /** Connects a socket, joins the conversation room, and records every message:new. */
  async function joinedSocket(token: string, conversationId: string) {
    const socket = io(`${baseUrl}${REALTIME_NAMESPACE}`, {
      auth: { token },
      transports: ["websocket"],
      forceNew: true,
    });
    sockets.push(socket);
    const received: MessageNew[] = [];
    socket.on("message:new", (event: MessageNew) => received.push(event));

    await new Promise<void>((resolve, reject) => {
      socket.once("connect", () => resolve());
      socket.once("connect_error", reject);
    });
    const ack = (await socket.emitWithAck("conversation:join", {
      conversationId,
    })) as { ok: boolean };
    expect(ack.ok).toBe(true);
    return { socket, received };
  }

  async function waitFor(received: MessageNew[], count: number) {
    const deadline = Date.now() + 5_000;
    while (received.length < count && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
  }

  it("delivers an image sent over HTTP to the peer and the sender's other device", async () => {
    const { buyerToken, sellerToken, conversationId } = await seedConversation();
    const peer = await joinedSocket(sellerToken, conversationId);
    const senderDevice = await joinedSocket(buyerToken, conversationId);

    const res = await request
      .post(`/api/v1/conversations/${conversationId}/messages/rich`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({
        kind: "image",
        metadata: { key: "chat-attachments/broadcast/original.jpg", width: 800, height: 600 },
        clientMessageId: "client-img-1",
      })
      .expect(201);

    await waitFor(peer.received, 1);
    await waitFor(senderDevice.received, 1);

    const expected = {
      id: res.body.id,
      conversationId,
      senderId: suite.id("buyer-1"),
      kind: "image",
      metadata: { key: "chat-attachments/broadcast/original.jpg", width: 800, height: 600 },
      clientMessageId: "client-img-1",
    };
    expect(peer.received).toHaveLength(1);
    expect(peer.received[0]?.message).toMatchObject(expected);
    expect(senderDevice.received).toHaveLength(1);
    expect(senderDevice.received[0]?.message).toMatchObject(expected);
    expect(messageSentEvents).toHaveLength(1);
  });

  it("delivers a post-reference card sent over HTTP to the peer", async () => {
    const { buyerToken, sellerToken, conversationId, listingId } =
      await seedConversation();
    const peer = await joinedSocket(sellerToken, conversationId);

    const res = await request
      .post(`/api/v1/conversations/${conversationId}/messages/post-ref`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ metadata: { listingId }, clientMessageId: "client-ref-1" })
      .expect(201);

    await waitFor(peer.received, 1);

    expect(peer.received).toHaveLength(1);
    expect(peer.received[0]?.message).toMatchObject({
      id: res.body.id,
      kind: "post_ref",
      clientMessageId: "client-ref-1",
      metadata: expect.objectContaining({ listingId, available: true }),
    });
    expect(messageSentEvents).toHaveLength(1);
  });

  it("delivers a legacy text message sent over HTTP to the peer", async () => {
    const { buyerToken, sellerToken, conversationId } = await seedConversation();
    const peer = await joinedSocket(sellerToken, conversationId);

    const res = await request
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ text: "Hello over HTTP" })
      .expect(201);

    await waitFor(peer.received, 1);

    expect(peer.received).toHaveLength(1);
    expect(peer.received[0]?.message).toMatchObject({
      id: res.body.id,
      kind: "text",
      text: "Hello over HTTP",
    });
    expect(peer.received[0]?.message).not.toHaveProperty("clientMessageId");
    expect(messageSentEvents).toHaveLength(1);
  });

  it("broadcasts a socket send exactly once, including across a retry", async () => {
    const { buyerToken, sellerToken, conversationId } = await seedConversation();
    const peer = await joinedSocket(sellerToken, conversationId);
    const sender = await joinedSocket(buyerToken, conversationId);

    const payload = {
      conversationId,
      kind: "text",
      text: "Hello over socket",
      clientMessageId: "client-sock-1",
    };
    const first = (await sender.socket.emitWithAck("message:send", payload)) as {
      ok: boolean;
      message: { id: string };
    };
    const retry = (await sender.socket.emitWithAck("message:send", payload)) as {
      ok: boolean;
      message: { id: string };
    };

    await waitFor(peer.received, 1);

    expect(first.ok).toBe(true);
    expect(retry.message.id).toBe(first.message.id);
    expect(peer.received).toHaveLength(1);
    expect(peer.received[0]?.message).toMatchObject({
      id: first.message.id,
      clientMessageId: "client-sock-1",
    });
    expect(sender.received).toHaveLength(1);
    expect(messageSentEvents).toHaveLength(1);
  });
});
