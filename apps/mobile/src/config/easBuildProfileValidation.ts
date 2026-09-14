export type MobileBuildProfile = "development" | "staging" | "production-smoke" | "production";

type ValidationInput = {
  profile: string | undefined;
  apiUrl: string | undefined;
  wsUrl: string | undefined;
  mediaUrl: string | undefined;
  productionSmokeHosts?: { api: string | undefined; ws: string | undefined; media: string | undefined };
};

type ParsedUrl = {
  raw: string;
  parsed: URL;
};

const INTERNAL_PROFILES = new Set<MobileBuildProfile>(["staging", "production-smoke"]);

function isMobileBuildProfile(value: string): value is MobileBuildProfile {
  return (
    value === "development" ||
    value === "staging" ||
    value === "production-smoke" ||
    value === "production"
  );
}

function parseRequiredUrl(name: string, value: string | undefined, errors: string[]): ParsedUrl | null {
  if (!value) {
    errors.push(`${name} is required`);
    return null;
  }

  try {
    return { raw: value, parsed: new URL(value) };
  } catch {
    errors.push(`${name} must be a valid absolute URL`);
    return null;
  }
}

function isIpLiteral(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
}

function isLocalhost(hostname: string): boolean {
  return hostname === "localhost" || hostname.endsWith(".localhost");
}

function isRailwayHost(hostname: string): boolean {
  return hostname === "up.railway.app" || hostname.endsWith(".up.railway.app");
}

function isAutoTmOwnedHost(hostname: string): boolean {
  return hostname === "auto.tm" || hostname.endsWith(".auto.tm");
}

function requireProtocol(name: string, url: ParsedUrl | null, protocols: string[], errors: string[]): void {
  if (!url) {
    return;
  }

  if (!protocols.includes(url.parsed.protocol)) {
    errors.push(`${name} must use ${protocols.join(" or ")}`);
  }
}

function rejectUnsafeProductionHost(name: string, url: ParsedUrl | null, errors: string[]): void {
  if (!url) {
    return;
  }

  const hostname = url.parsed.hostname.toLowerCase();
  if (isLocalhost(hostname) || isIpLiteral(hostname) || isRailwayHost(hostname)) {
    errors.push(`${name} must not use localhost, IP literals, or Railway-generated hosts in production`);
    return;
  }

  if (!isAutoTmOwnedHost(hostname)) {
    errors.push(`${name} must use auto.tm or a subdomain of auto.tm in production`);
  }
}

function requireRailwayHost(name: string, url: ParsedUrl | null, errors: string[]): void {
  if (!url) {
    return;
  }

  if (!isRailwayHost(url.parsed.hostname.toLowerCase())) {
    errors.push(`${name} must use a Railway-generated *.up.railway.app host`);
  }
}

function isApprovableRailwayHost(hostname: string): boolean {
  // Stricter than isRailwayHost: an approval names exactly one Railway service
  // label, so bare `up.railway.app` and multi-label hosts are both refused.
  return isRailwayHost(hostname) && /^[a-z0-9-]+\.up\.railway\.app$/.test(hostname);
}

function requireProductionSmokeHost(
  name: string,
  approvalName: string,
  url: ParsedUrl | null,
  expectedHost: string | undefined,
  errors: string[],
): void {
  // Approvals must come from production provider readback, never from the
  // resolved EXPO_PUBLIC_* URLs being checked. An approval is a bare hostname:
  // no scheme, no port, no path.
  const approvedHost = expectedHost?.toLowerCase();
  if (!approvedHost || !isApprovableRailwayHost(approvedHost) || approvedHost.includes("staging")) {
    errors.push(`${name} requires an approved production-smoke hostname in ${approvalName}`);
    return;
  }

  if (
    url &&
    (url.parsed.hostname.toLowerCase() !== approvedHost ||
      url.parsed.username || url.parsed.password || url.parsed.port)
  ) {
    errors.push(`${name} must match its approved production-smoke host without credentials or a custom port`);
  }
}

export function validateEasBuildProfile(input: ValidationInput): string[] {
  const errors: string[] = [];
  const profile = input.profile;

  if (!profile || !isMobileBuildProfile(profile)) {
    return [`EAS_BUILD_PROFILE must be one of: development, staging, production-smoke, production`];
  }

  if (profile === "development") {
    return [];
  }

  const apiUrl = parseRequiredUrl("EXPO_PUBLIC_API_URL", input.apiUrl, errors);
  const wsUrl = parseRequiredUrl("EXPO_PUBLIC_WS_URL", input.wsUrl, errors);
  const mediaUrl = parseRequiredUrl("EXPO_PUBLIC_MEDIA_URL", input.mediaUrl, errors);

  requireProtocol("EXPO_PUBLIC_API_URL", apiUrl, ["https:"], errors);
  requireProtocol("EXPO_PUBLIC_WS_URL", wsUrl, ["wss:"], errors);
  requireProtocol("EXPO_PUBLIC_MEDIA_URL", mediaUrl, ["https:"], errors);

  if (profile === "production") {
    rejectUnsafeProductionHost("EXPO_PUBLIC_API_URL", apiUrl, errors);
    rejectUnsafeProductionHost("EXPO_PUBLIC_WS_URL", wsUrl, errors);
    rejectUnsafeProductionHost("EXPO_PUBLIC_MEDIA_URL", mediaUrl, errors);
  }

  if (INTERNAL_PROFILES.has(profile)) {
    requireRailwayHost("EXPO_PUBLIC_API_URL", apiUrl, errors);
    requireRailwayHost("EXPO_PUBLIC_WS_URL", wsUrl, errors);
    requireRailwayHost("EXPO_PUBLIC_MEDIA_URL", mediaUrl, errors);
  }

  if (profile === "production-smoke") {
    const hosts = input.productionSmokeHosts;
    requireProductionSmokeHost("EXPO_PUBLIC_API_URL", "PRODUCTION_SMOKE_API_HOST", apiUrl, hosts?.api, errors);
    requireProductionSmokeHost("EXPO_PUBLIC_WS_URL", "PRODUCTION_SMOKE_WS_HOST", wsUrl, hosts?.ws, errors);
    requireProductionSmokeHost("EXPO_PUBLIC_MEDIA_URL", "PRODUCTION_SMOKE_MEDIA_HOST", mediaUrl, hosts?.media, errors);
  }

  return errors;
}

export function validateCurrentEasBuildProfile(env: Record<string, string | undefined>): string[] {
  return validateEasBuildProfile({
    profile: env["EAS_BUILD_PROFILE"],
    apiUrl: env["EXPO_PUBLIC_API_URL"],
    wsUrl: env["EXPO_PUBLIC_WS_URL"],
    mediaUrl: env["EXPO_PUBLIC_MEDIA_URL"],
    productionSmokeHosts: {
      api: env["PRODUCTION_SMOKE_API_HOST"],
      ws: env["PRODUCTION_SMOKE_WS_HOST"],
      media: env["PRODUCTION_SMOKE_MEDIA_HOST"],
    },
  });
}
