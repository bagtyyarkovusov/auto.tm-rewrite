import { AuthSchemas } from "@auto-tm/contracts";

type Schema<T> = {
  parse: (value: unknown) => T;
};

type ApiErrorBody = {
  code?: string;
  message?: string;
};

export class AuthApiError extends Error {
  readonly code?: string;
  readonly statusCode?: number;

  constructor(message: string, options: { code?: string; statusCode?: number } = {}) {
    super(message);
    this.name = "AuthApiError";
    this.code = options.code;
    this.statusCode = options.statusCode;
  }
}

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:3000/api/v1";

function buildUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    ("message" in value || "code" in value)
  );
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  return JSON.parse(text) as unknown;
}

async function parseResponse<T>(
  response: Response,
  schema: Schema<T>,
): Promise<T> {
  const json = await readJson(response);

  if (!response.ok) {
    if (isApiErrorBody(json)) {
      throw new AuthApiError(json.message ?? "Auth request failed", {
        code: json.code,
        statusCode: response.status,
      });
    }

    throw new AuthApiError("Auth request failed", { statusCode: response.status });
  }

  return schema.parse(json);
}

async function postJson<T>(
  path: string,
  body: unknown,
  schema: Schema<T>,
): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return parseResponse(response, schema);
}

export function requestOtp(
  input: AuthSchemas.OtpRequestRequest,
): Promise<AuthSchemas.OtpRequestResponse> {
  return postJson(
    "/auth/otp/request",
    input,
    AuthSchemas.OtpRequestResponseSchema,
  );
}

export function verifyOtp(
  input: AuthSchemas.OtpVerifyRequest,
): Promise<AuthSchemas.OtpVerifyResponse> {
  return postJson(
    "/auth/otp/verify",
    input,
    AuthSchemas.OtpVerifyResponseSchema,
  );
}
