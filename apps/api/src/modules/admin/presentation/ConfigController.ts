import { Controller, Get, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { Public } from "../../../common/public.decorator";
import type { Env } from "../../../env.schema";

@Controller("api/v1")
export class ConfigController {
  constructor(
    @Inject(ConfigService)
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Get("config")
  getConfig() {
    return {
      reportEntryEnabled: this.config.get("REPORT_ENTRY_ENABLED", { infer: true }),
      adminModerationActionsEnabled: this.config.get(
        "ADMIN_MODERATION_ACTIONS_ENABLED",
        { infer: true },
      ),
    };
  }
}
