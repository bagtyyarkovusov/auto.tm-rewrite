/**
 * Deploy health endpoint for Railway healthchecks. Dependency-free by
 * contract: it never calls the API, Postgres, Redis, or MinIO, so a dead
 * downstream cannot fail the admin deploy health signal.
 *
 * AUTOTM_COMMIT_SHA is baked into the image at build time (see
 * infra/docker/admin.Dockerfile) so deploy evidence identifies the exact
 * revision even when Railway rebuilds it.
 */
export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json({
    status: "ok",
    service: "admin",
    commitSha: process.env["AUTOTM_COMMIT_SHA"] ?? "unknown",
    environment:
      process.env["RAILWAY_ENVIRONMENT_NAME"] ??
      process.env["APP_ENV"] ??
      "development",
  });
}
