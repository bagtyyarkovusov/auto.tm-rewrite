import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import {
  type LocalizedRequest,
  parseAcceptLanguage,
  registerAcceptLanguageHook,
} from "./accept-language";

describe("parseAcceptLanguage", () => {
  it("accepts the three supported languages", () => {
    expect(parseAcceptLanguage("tk")).toBe("tk");
    expect(parseAcceptLanguage("ru")).toBe("ru");
    expect(parseAcceptLanguage("en")).toBe("en");
  });

  it("reduces a regional tag to its language", () => {
    expect(parseAcceptLanguage("en-US")).toBe("en");
    expect(parseAcceptLanguage("ru-RU")).toBe("ru");
    expect(parseAcceptLanguage("tk-TM")).toBe("tk");
  });

  it("takes the first tag of a weighted list", () => {
    expect(parseAcceptLanguage("tk,ru;q=0.9,en;q=0.8")).toBe("tk");
    expect(parseAcceptLanguage("en-US,en;q=0.9")).toBe("en");
  });

  it("falls back to Russian for anything unsupported or absent", () => {
    expect(parseAcceptLanguage(undefined)).toBe("ru");
    expect(parseAcceptLanguage("")).toBe("ru");
    expect(parseAcceptLanguage("de-DE")).toBe("ru");
    expect(parseAcceptLanguage("*")).toBe("ru");
  });

  it("is case-insensitive", () => {
    expect(parseAcceptLanguage("TK")).toBe("tk");
    expect(parseAcceptLanguage("EN-GB")).toBe("en");
  });
});

describe("registerAcceptLanguageHook", () => {
  // The bug this hook replaced: a Nest middleware wrote the locale onto the raw
  // Node request, so the route handler's request object never saw it.
  it("sets locale on the request object a route handler receives", async () => {
    const fastify = Fastify();
    registerAcceptLanguageHook(fastify);
    fastify.get("/probe", async (request) => ({
      locale: (request as LocalizedRequest).locale,
    }));

    const withHeader = await fastify.inject({
      method: "GET",
      url: "/probe",
      headers: { "accept-language": "tk-TM,ru;q=0.8" },
    });
    const withoutHeader = await fastify.inject({ method: "GET", url: "/probe" });

    expect(withHeader.json()).toEqual({ locale: "tk" });
    expect(withoutHeader.json()).toEqual({ locale: "ru" });
    await fastify.close();
  });
});
