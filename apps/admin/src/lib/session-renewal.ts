import { createHash } from "node:crypto";

import { getApiBaseUrl } from "./api-config";

const HANDOFF_MS = 5_000;
const MAX_ENTRIES = 128;
const REFRESH_TIMEOUT_MS = 10_000;
const entries = new Map<string, Promise<TokenPair | null>>();

type TokenPair = { accessToken: string; refreshToken: string };

/** An expiry hint only. The API still validates signatures and session state. */
export function hasCurrentAccessToken(token: string | undefined): boolean {
  if (!token) return false;
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as { exp?: unknown };
    return typeof payload.exp === "number" && Number.isFinite(payload.exp) && payload.exp * 1000 > Date.now() + 5_000;
  } catch {
    return false;
  }
}

/** Only the Node proxy calls this; no render/action bundle owns a second cache. */
export function renewSession(refreshToken: string): Promise<TokenPair | null> {
  if (!/^[a-f0-9]{64}$/.test(refreshToken)) return Promise.resolve(null);
  const key = createHash("sha256").update(refreshToken).digest("hex");
  const shared = entries.get(key);
  if (shared) return shared;
  // Never evict an in-flight owner: eviction could rotate the same token twice.
  if (entries.size >= MAX_ENTRIES) return Promise.resolve(null);

  const pending = rotate(refreshToken);
  entries.set(key, pending);
  void pending.then((tokens) => {
    if (!tokens) {
      entries.delete(key);
      return;
    }
    // Successful results alone are retained for a few seconds. The timer
    // releases the pair even when there are no further incoming requests.
    setTimeout(() => { entries.delete(key); }, HANDOFF_MS).unref();
  });
  return pending;
}

async function rotate(refreshToken: string): Promise<TokenPair | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => { controller.abort(); }, REFRESH_TIMEOUT_MS);
  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: "POST", cache: "no-store", signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return null;
    const tokens = await response.json() as Partial<TokenPair>;
    if (typeof tokens.accessToken !== "string" || !hasCurrentAccessToken(tokens.accessToken) || typeof tokens.refreshToken !== "string" || !/^[a-f0-9]{64}$/.test(tokens.refreshToken)) return null;
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
