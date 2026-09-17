import type { FastifyInstance, FastifyRequest } from "fastify";

const SUPPORTED_LOCALES = new Set(["tk", "ru", "en"]);
const DEFAULT_LOCALE = "ru";

export interface LocalizedRequest extends FastifyRequest {
  locale?: string;
}

/**
 * Resolves the request locale from an `Accept-Language` header.
 *
 * Deliberately not a Nest middleware. Under the Fastify adapter, middleware
 * registered with `consumer.apply()` runs through middie and receives the raw
 * Node `IncomingMessage`, while `@Req()` in a controller receives Fastify's
 * request wrapper — a different object. A middleware that set `request.locale`
 * therefore wrote to `request.raw`, and every controller reading `req.locale`
 * saw `undefined` and silently fell back to Russian. This is registered as a
 * Fastify `onRequest` hook (`registerAcceptLanguageHook`, called from
 * `main.ts`) instead, because hooks receive the same request object the
 * controllers do. The hook runs for every API request, not only catalog routes.
 *
 * Only the first tag is considered and quality values are ignored; the catalog
 * is translated into exactly three languages, so full RFC 4647 negotiation
 * would be more machinery than the problem needs.
 */
export function parseAcceptLanguage(header: string | undefined): string {
  if (!header || typeof header !== "string") {
    return DEFAULT_LOCALE;
  }

  const rawTag = header.split(",")[0]?.trim() ?? "";
  const language = rawTag.split("-")[0]?.trim().toLowerCase() ?? "";

  if (SUPPORTED_LOCALES.has(language)) {
    return language;
  }

  return DEFAULT_LOCALE;
}

/** Sets `request.locale` from `Accept-Language` on every request. */
export function registerAcceptLanguageHook(fastify: FastifyInstance): void {
  fastify.addHook("onRequest", (request, _reply, done) => {
    (request as LocalizedRequest).locale = parseAcceptLanguage(
      request.headers["accept-language"],
    );
    done();
  });
}
