import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/healthz", async (_req, reply) => {
    return reply.status(200).send({ status: "ok" });
  });

  app.get("/readyz", async (_req, reply) => {
    return reply.status(200).send({ status: "ok" });
  });
};
