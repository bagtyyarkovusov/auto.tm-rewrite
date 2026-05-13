import { buildApp } from "./server.js";

const { app, env } = buildApp();

try {
  await app.listen({ host: "0.0.0.0", port: env.PORT });
} catch (err) {
  app.log.fatal(err);
  process.exit(1);
}
