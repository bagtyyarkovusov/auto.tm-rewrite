import { Controller, Get } from "@nestjs/common";

import { Public } from "../../../common/public.decorator";

@Controller("api/v1/notifications")
export class NotificationsController {
  @Public()
  @Get("ping")
  ping(): { context: "notifications"; status: "ok" } {
    return { context: "notifications", status: "ok" };
  }
}
