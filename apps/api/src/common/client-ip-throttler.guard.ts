import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

import { resolveClientIp, type ClientIpRequest } from "./client-ip";

/**
 * The global rate limit, keyed on the caller instead of the proxy hop. Behind
 * Railway's edge `req.ip` is the proxy, so every visitor would share one
 * bucket; the key comes from the same trusted source as the Sign-in Code budget.
 */
@Injectable()
export class ClientIpThrottlerGuard extends ThrottlerGuard {
  protected override getTracker(req: Record<string, unknown>): Promise<string> {
    return Promise.resolve(resolveClientIp(req as ClientIpRequest));
  }
}
