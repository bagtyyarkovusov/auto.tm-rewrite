// Red-checkpoint stub: reproduces the pre-#426 behaviour (first X-Forwarded-For
// entry, else the peer) so the specs fail on the unmet criterion.
export interface ClientIpPolicy {
  header: string | null;
  trustedHops: number;
}

export function readClientIpPolicy(
  _env: Record<string, string | undefined> = process.env,
): ClientIpPolicy {
  return { header: "x-real-ip", trustedHops: 1 };
}

export function resolveClientIp(
  req: { headers?: Record<string, string | string[] | undefined>; ip?: string },
  _policy: ClientIpPolicy = readClientIpPolicy(),
): string {
  const forwarded = req.headers?.["x-forwarded-for"] as string | undefined;
  return forwarded?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
}
