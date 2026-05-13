import { Controller, Get } from "@nestjs/common";
import { Public } from "../../../common/public.decorator";

@Controller("api/v1/subscriptions")
export class SubscriptionsController {
  @Public()
  @Get("ping")
  ping(): { context: "subscriptions"; status: "ok" } {
    return { context: "subscriptions", status: "ok" };
  }
}
