import { isIP, isIPv4 } from "node:net";

import { z } from "zod";

/**
 * Which address the API treats as the caller's (ADR-0078).
 *
 * `x-forwarded-for` is the one header read as a list, because every proxy
 * appends the address it received the request from. With `trustedHops` proxies
 * of ours in front, the entry that many places from the right is the client as
 * the outermost of them saw it. Entries further left arrive from the caller
 * and are never read. Any other header holds exactly one address, written by
 * the edge.
 * `header: null` trusts no header and uses the peer address.
 */
export interface ClientIpPolicy {
  header: string | null;
  trustedHops: number;
}

/** Environment fields that configure the policy, shared with `env.schema.ts`. */
export const clientIpEnvShape = {
  /** Railway's edge sets `X-Real-IP` to the client address. `none` trusts no header. */
  CLIENT_IP_HEADER: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "CLIENT_IP_HEADER must be an HTTP header name or none",
    )
    .default("x-real-ip"),
  /** Proxies we run that append to `x-forwarded-for`; read only for that header. */
  CLIENT_IP_TRUSTED_HOPS: z.coerce.number().int().min(1).max(10).default(1),
};

const clientIpEnvSchema = z.object(clientIpEnvShape);

/** Used when the configuration is invalid: trust nothing a caller can send. */
const PEER_ONLY: ClientIpPolicy = { header: null, trustedHops: 1 };

export function readClientIpPolicy(
  env: Record<string, string | undefined> = process.env,
): ClientIpPolicy {
  const parsed = clientIpEnvSchema.safeParse({
    CLIENT_IP_HEADER: env["CLIENT_IP_HEADER"],
    CLIENT_IP_TRUSTED_HOPS: env["CLIENT_IP_TRUSTED_HOPS"],
  });
  if (!parsed.success) return PEER_ONLY;

  const { CLIENT_IP_HEADER: header, CLIENT_IP_TRUSTED_HOPS: trustedHops } = parsed.data;
  return { header: header === "none" ? null : header, trustedHops };
}

/** The parts of a Fastify request (or a socket.io handshake) that carry the address. */
export interface ClientIpRequest {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
}

const FORWARDED_FOR = "x-forwarded-for";
const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

/** A single IP address in canonical form, or null. Zone ids and ports are refused. */
function normalizeIp(value: string | undefined): string | null {
  const candidate = value?.trim().toLowerCase();
  if (!candidate || candidate.includes("%") || isIP(candidate) === 0) return null;

  const mapped = IPV4_MAPPED.exec(candidate)?.[1];
  return mapped !== undefined && isIPv4(mapped) ? mapped : candidate;
}

function trustedHeaderIp(
  headers: NonNullable<ClientIpRequest["headers"]>,
  policy: ClientIpPolicy & { header: string },
): string | null {
  const raw = headers[policy.header];

  if (policy.header === FORWARDED_FOR) {
    const entries = (Array.isArray(raw) ? raw.join(",") : (raw ?? ""))
      .split(",")
      .map((entry) => entry.trim());
    return normalizeIp(entries[entries.length - policy.trustedHops]);
  }

  // A repeated header is ambiguous, so it names no client.
  return typeof raw === "string" ? normalizeIp(raw) : null;
}

/**
 * The caller's IP address for rate limiting. The single source for the Sign-in
 * Code per-IP budgets and the global throttler, so a caller cannot pick its own
 * bucket by sending a header the edge does not set. A missing or malformed
 * trusted header falls back to the peer address (the proxy hop when one is in
 * front), which shares a bucket rather than trusting the caller.
 */
export function resolveClientIp(
  req: ClientIpRequest,
  policy: ClientIpPolicy = readClientIpPolicy(),
): string {
  const peer = normalizeIp(req.ip) ?? "unknown";
  if (policy.header === null || !req.headers) return peer;

  return trustedHeaderIp(req.headers, { ...policy, header: policy.header }) ?? peer;
}
