import { MODULE_METADATA } from "@nestjs/common/constants";
import { APP_GUARD } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";

import { AppModule } from "./app.module";
import { AccountDeletionPendingGuard } from "./common/account-deletion-pending.guard";
import { ClientIpThrottlerGuard } from "./common/client-ip-throttler.guard";
import { JwtAuthGuard } from "./common/jwt-auth.guard";

// ConfigModule.forRoot validates the environment when AppModule is imported.
// This test reads decorator metadata only, so it must not need a real one.
vi.mock("./env.schema", () => ({
  parseEnv: (config: Record<string, unknown>) => config,
}));

interface ProviderEntry {
  provide?: unknown;
  useClass?: unknown;
}

describe("AppModule global guards", () => {
  it("runs JwtAuthGuard, then ClientIpThrottlerGuard, then AccountDeletionPendingGuard", () => {
    const providers: ProviderEntry[] =
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, AppModule) ?? [];

    const guards = providers
      .filter((provider) => provider.provide === APP_GUARD)
      .map((provider) => provider.useClass);

    // Guards run in registration order. The pending-deletion check needs the
    // signed-in User, and a throttled request should not cost a database read.
    // The throttler must key on the trusted client IP (ADR-0078); the stock
    // ThrottlerGuard keys on the proxy hop, so every visitor shares one bucket.
    expect(guards).toEqual([
      JwtAuthGuard,
      ClientIpThrottlerGuard,
      AccountDeletionPendingGuard,
    ]);
  });
});
