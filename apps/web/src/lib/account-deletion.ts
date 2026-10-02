import { AuthSchemas, ErrorCode, ErrorResponseSchema } from "@auto-tm/contracts";

import type { Locale } from "@/i18n/locales";

/**
 * Server-side client for the public account deletion endpoints (ADR-0054).
 *
 * The API answers the same way whether or not a User holds the phone or
 * email, and every result here is derived only from that answer, so the page
 * cannot reveal more than the API does.
 */

export type DeletionChannel = "phone" | "email";

export type DeletionFailure =
  | "invalid-value"
  | "invalid-code-format"
  | "invalid-code"
  | "rate-limited"
  | "unavailable";

export type RequestDeletionResult =
  | { ok: true; destination: string; resendInSeconds: number }
  | { ok: false; error: DeletionFailure };

export type ConfirmDeletionResult = { ok: true } | { ok: false; error: DeletionFailure };

export interface DeletionApiContext {
  /** API origin, with or without `/api/v1`; deployments set either form. */
  baseUrl: string;
  locale: Locale;
  /**
   * The visitor's IP, from `visitorIp`. The API applies its per-IP code budget
   * to the `X-Real-IP` it receives (ADR-0078), so without it every visitor
   * would share the web server's budget.
   */
  clientIp: string | null;
  fetch?: typeof fetch;
}

const TM_COUNTRY_CODE = "+993";

/** Accepts `61234567`, `+993 61 23-45-67`, `99361234567` or `061234567`. */
export function normalizePhoneInput(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("993")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return `${TM_COUNTRY_CODE}${digits}`;
}

function destinationBody(channel: DeletionChannel, value: string) {
  return channel === "phone"
    ? { phone: normalizePhoneInput(value) }
    : { email: value };
}

export function apiUrl(baseUrl: string, path: string): string {
  const origin = baseUrl.replace(/\/+$/, "").replace(/\/api\/v1$/, "");
  return `${origin}/api/v1${path}`;
}

export function firstForwardedIp(header: string | null): string | null {
  const first = header?.split(",")[0]?.trim();
  return first ? first : null;
}

/**
 * The visitor's IP from the incoming request. Railway's edge sets `X-Real-IP`
 * to the client's address, while `X-Forwarded-For` can arrive from the visitor
 * unchanged, so `X-Real-IP` wins and `X-Forwarded-For` is only a fallback
 * (local development, other proxies).
 */
export function visitorIp(headers: { get(name: string): string | null }): string | null {
  return (
    firstForwardedIp(headers.get("x-real-ip")) ??
    firstForwardedIp(headers.get("x-forwarded-for"))
  );
}

/** Keeps a hung API from holding the Server Function and the pending form. */
const API_TIMEOUT_MS = 10_000;

async function post(
  path: string,
  body: unknown,
  context: DeletionApiContext,
): Promise<Response | null> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept-Language": context.locale,
  };
  if (context.clientIp) headers["X-Real-IP"] = context.clientIp;

  try {
    return await (context.fetch ?? fetch)(apiUrl(context.baseUrl, path), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch (error) {
    // Never log the destination or the code.
    console.error("[account-deletion] API unreachable", {
      path,
      error: error instanceof Error ? error.name : String(error),
    });
    return null;
  }
}

const ErrorCodeBody = ErrorResponseSchema.pick({ code: true });

async function failureFrom(response: Response): Promise<DeletionFailure> {
  // The API's global throttler answers 429 with a code outside `ErrorCode`.
  if (response.status === 429) return "rate-limited";
  const parsed = ErrorCodeBody.safeParse(await response.json().catch(() => null));

  switch (parsed.success ? parsed.data.code : null) {
    case ErrorCode.RateLimited:
      return "rate-limited";
    case ErrorCode.InvalidOtp:
      return "invalid-code";
    case ErrorCode.ValidationFailed:
      return "invalid-value";
    default:
      console.error("[account-deletion] API error", {
        url: response.url,
        status: response.status,
        code: parsed.success ? parsed.data.code : null,
      });
      return "unavailable";
  }
}

export async function requestAccountDeletion(
  channel: DeletionChannel,
  value: string,
  context: DeletionApiContext,
): Promise<RequestDeletionResult> {
  const parsed = AuthSchemas.AccountDeletionRequestSchema.safeParse(
    destinationBody(channel, value),
  );
  if (!parsed.success) return { ok: false, error: "invalid-value" };

  const response = await post("/account-deletion/request", parsed.data, context);
  if (!response) return { ok: false, error: "unavailable" };
  if (!response.ok) return { ok: false, error: await failureFrom(response) };

  const body = AuthSchemas.AccountDeletionRequestResponseSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!body.success) {
    console.error("[account-deletion] unexpected request response", { status: response.status });
    return { ok: false, error: "unavailable" };
  }

  return {
    ok: true,
    destination: "phone" in parsed.data ? parsed.data.phone : parsed.data.email,
    resendInSeconds: body.data.resendInSeconds,
  };
}

/**
 * `destination` is the normalized value returned by `requestAccountDeletion`.
 */
export async function confirmAccountDeletion(
  channel: DeletionChannel,
  destination: string,
  code: string,
  context: DeletionApiContext,
): Promise<ConfirmDeletionResult> {
  const target = destinationBody(channel, destination);
  const parsed = AuthSchemas.AccountDeletionConfirmRequestSchema.safeParse({
    ...target,
    code: code.trim(),
  });
  if (!parsed.success) {
    // A failed union hides which field broke, so check the destination alone.
    const destinationValid =
      AuthSchemas.AccountDeletionRequestSchema.safeParse(target).success;
    return {
      ok: false,
      error: destinationValid ? "invalid-code-format" : "invalid-value",
    };
  }

  const response = await post("/account-deletion/confirm", parsed.data, context);
  if (!response) return { ok: false, error: "unavailable" };
  if (!response.ok) return { ok: false, error: await failureFrom(response) };
  return { ok: true };
}
