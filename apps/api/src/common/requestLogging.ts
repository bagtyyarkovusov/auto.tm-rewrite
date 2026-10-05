import type { Options } from "pino-http";

/**
 * Request headers that carry credentials. pino-http logs every request
 * header by default, so without this a bearer token, a refresh cookie or a
 * reviewer secret would land in the hosting provider's logs.
 */
const SECRET_HEADER_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  'req.headers["proxy-authorization"]',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',
];

/** Options for the API's HTTP request logger (`LoggerModule.forRoot`). */
export function requestLoggingOptions(level: string): Options {
  return {
    level,
    redact: { paths: SECRET_HEADER_PATHS, censor: "[Redacted]" },
    // Search terms and other query values are not logged: the path is
    // enough to trace a request, and Recent searches stay on the device.
    serializers: {
      req(req: { url?: string }) {
        if (typeof req.url === "string") req.url = req.url.split("?")[0] ?? req.url;
        return req;
      },
    },
  };
}
