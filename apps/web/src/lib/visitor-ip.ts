import { isIP } from "node:net";

/**
 * Which address web treats as the visitor's, and how it hands that address to
 * the API (ADR-0078). Web reads the same `CLIENT_IP_HEADER` and
 * `CLIENT_IP_TRUSTED_HOPS` rule as the API, for the ingress in front of web.
 * `apiHeader` is the header the API trusts on web's private path.
 */
export interface VisitorIpPolicy {
  /** `null` trusts no incoming header, so web forwards no address. */
  header: string | null;
  trustedHops: number;
  apiHeader: string;
}

const FORWARDED_FOR = "x-forwarded-for";
const HEADER_NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Used when the configuration is invalid: forward nothing a visitor can write. */
const TRUST_NOTHING: VisitorIpPolicy = { header: null, trustedHops: 1, apiHeader: "x-real-ip" };

function headerName(value: string | undefined, fallback: string): string | null {
  const name = (value ?? fallback).trim().toLowerCase();
  return HEADER_NAME.test(name) ? name : null;
}

export function readVisitorIpPolicy(
  env: Record<string, string | undefined> = process.env,
): VisitorIpPolicy {
  const header = headerName(env["CLIENT_IP_HEADER"], "x-real-ip");
  const apiHeader = headerName(env["API_CLIENT_IP_HEADER"], "x-real-ip");
  const hopsText = (env["CLIENT_IP_TRUSTED_HOPS"] ?? "1").trim();
  const trustedHops = /^\d+$/.test(hopsText) ? Number(hopsText) : Number.NaN;
  if (header === null || apiHeader === null || !(trustedHops >= 1 && trustedHops <= 10)) {
    return TRUST_NOTHING;
  }

  return { header: header === "none" ? null : header, trustedHops, apiHeader };
}

/** One IP address, or null. Lists, ports and zone ids are refused. */
function singleIp(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate || candidate.includes("%") || isIP(candidate) === 0) return null;
  return candidate;
}

/**
 * The visitor's IP from the incoming request, read only from the header the
 * ingress in front of web writes. A missing or malformed value gives null, so
 * the API counts web's own address and shares a bucket rather than letting a
 * visitor pick one. A visitor-written `X-Forwarded-For` entry is never read.
 */
export function visitorIp(
  headers: { get(name: string): string | null },
  policy: VisitorIpPolicy = readVisitorIpPolicy(),
): string | null {
  if (policy.header === null) return null;
  const raw = headers.get(policy.header);
  if (policy.header !== FORWARDED_FOR) return singleIp(raw ?? undefined);

  const entries = (raw ?? "").split(",").map((entry) => entry.trim());
  return singleIp(entries[entries.length - policy.trustedHops]);
}
