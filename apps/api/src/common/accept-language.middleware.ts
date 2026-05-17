import type { NestMiddleware } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";

const SUPPORTED_LOCALES = new Set(["tk", "ru", "en"]);
const DEFAULT_LOCALE = "ru";

export interface LocalizedRequest extends FastifyRequest {
  locale?: string;
}

@Injectable()
export class AcceptLanguageMiddleware implements NestMiddleware {
  use(request: LocalizedRequest, _reply: FastifyReply, next: () => void): void {
    const header = request.headers["accept-language"];
    const locale = AcceptLanguageMiddleware.parseLocale(header);
    request.locale = locale;
    next();
  }

  static parseLocale(header: string | undefined): string {
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
}
